import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { createLock, writeLock, readLock, diffLock } from "../src/core/lockWriter";
import type { AgentQuiltLock } from "../src/schemas/lock.schema";
import { AgentOutputRecordSchema } from "../src/schemas/lock.schema";

let tmpDir: string;

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `aq-lock-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeLock(overrides: Partial<AgentQuiltLock> = {}): AgentQuiltLock {
  return {
    lockfileVersion: 1,
    formatVersion: "1",
    agents: [],
    fragments: [],
    targets: [],
    ...overrides,
  };
}

describe("createLock", () => {
  it("sorts fragments by id", () => {
    const fragmentMap = new Map([
      ["z/010.md", { body: "z\n", hash: "sha256-aaa", bytes: 2, tags: [] }],
      ["a/010.md", { body: "a\n", hash: "sha256-bbb", bytes: 2, tags: [] }],
    ]);
    const lock = createLock(fragmentMap, []);
    expect(lock.fragments.map((f) => f.id)).toEqual(["a/010.md", "z/010.md"]);
  });

  it("sorts targets by output path", () => {
    const compiledTargets = [
      { output: "Z.md", format: "markdown", fragmentIds: [], version: "v2", content: "" },
      { output: "A.md", format: "markdown", fragmentIds: [], version: "v1", content: "" },
    ];
    const lock = createLock(new Map(), compiledTargets);
    expect(lock.targets.map((t) => t.output)).toEqual(["A.md", "Z.md"]);
  });

  it("preserves fragment resolution order per target", () => {
    const fragmentMap = new Map([
      ["a/010.md", { body: "a\n", hash: "sha256-aaa", bytes: 2, tags: [] }],
      ["b/020.md", { body: "b\n", hash: "sha256-bbb", bytes: 2, tags: [] }],
    ]);
    const compiledTargets = [
      {
        output: "OUT.md",
        format: "markdown",
        fragmentIds: ["b/020.md", "a/010.md"],
        version: "v1",
        content: "",
      },
    ];
    const lock = createLock(fragmentMap, compiledTargets);
    expect(lock.targets[0].fragments).toEqual(["b/020.md", "a/010.md"]);
  });

  it("sorts agents by name", () => {
    const agents = [
      { name: "zebra", dir: "z", bodyFragments: [], metaHash: "h1", version: "v1", outputs: {} },
      { name: "alpha", dir: "a", bodyFragments: [], metaHash: "h2", version: "v2", outputs: {} },
    ];
    const lock = createLock(new Map(), [], agents);
    expect(lock.agents.map((a) => a.name)).toEqual(["alpha", "zebra"]);
  });
});

describe("writeLock / readLock", () => {
  it("accepts legacy region output records for upgrade compatibility", () => {
    expect(
      AgentOutputRecordSchema.parse({
        platform: "codex",
        path: ".codex/config.toml",
        kind: "region",
        hash: "sha256-legacy",
      }).kind
    ).toBe("region");
  });

  it("applies persisted-schema defaults when reading a legacy lock", () => {
    const lockPath = path.join(tmpDir, "agentquilt" + ".lock");
    writeFileSync(
      lockPath,
      JSON.stringify({
        lockfileVersion: 1,
        formatVersion: "1",
        fragments: [],
        targets: [],
      }),
      "utf8"
    );

    expect(readLock(lockPath)?.agents).toEqual([]);
  });

  it("reads legacy region records through the production lock schema", () => {
    const lockPath = path.join(tmpDir, "agentquilt" + ".lock");
    const legacy = makeLock({
      agents: [{
        name: "helper",
        dir: ".agentquilt/agents/helper",
        bodyFragments: [],
        metaHash: "sha256-meta",
        version: "sha256-version",
        outputs: [{
          platform: "codex",
          path: ".codex/config.toml",
          kind: "region",
          hash: "sha256-legacy",
        }],
      }],
    });
    writeFileSync(lockPath, JSON.stringify(legacy), "utf8");

    expect(readLock(lockPath)?.agents[0].outputs[0].kind).toBe("region");
  });

  it("round-trips a lock through disk", () => {
    const lock = makeLock({
      fragments: [{ id: "a/010.md", hash: "sha256-abc", bytes: 4, tags: ["role"] }],
    });
    const lockPath = path.join(tmpDir, "agentquilt.lock");
    writeLock(lock, lockPath);
    const readBack = readLock(lockPath);
    expect(readBack).toEqual(lock);
  });

  it("returns null when lock file does not exist", () => {
    const result = readLock(path.join(tmpDir, "nonexistent.lock"));
    expect(result).toBeNull();
  });

  it("throws SyntaxError when lock file contains invalid JSON", () => {
    const lockPath = path.join(tmpDir, "agentquilt.lock");
    writeFileSync(lockPath, "{ not valid json", "utf8");
    expect(() => readLock(lockPath)).toThrow(SyntaxError);
  });

  it("writes pretty-printed JSON with trailing newline", () => {
    const lockPath = path.join(tmpDir, "agentquilt.lock");
    writeLock(makeLock(), lockPath);
    const content = readFileSync(lockPath, "utf8");
    expect(content).toMatch(/\n$/);
    expect(() => JSON.parse(content)).not.toThrow();
    // 2-space indent means first field line starts with two spaces
    expect(content).toMatch(/^  "/m);
  });
});

describe("diffLock", () => {
  it("reports no changes when locks are identical", () => {
    const lock = makeLock({
      fragments: [{ id: "a/010.md", hash: "sha256-aaa", bytes: 2, tags: [] }],
      targets: [{ output: "OUT.md", format: "markdown", fragments: ["a/010.md"], version: "v1" }],
    });
    const diff = diffLock(lock, lock);
    expect(diff.changed).toBe(false);
  });

  it("detects added fragment", () => {
    const base = makeLock();
    const next = makeLock({
      fragments: [{ id: "new/010.md", hash: "sha256-bbb", bytes: 2, tags: [] }],
    });
    const diff = diffLock(base, next);
    expect(diff.changed).toBe(true);
    expect(diff.fragmentChanges.added).toContain("new/010.md");
  });

  it("detects removed fragment", () => {
    const base = makeLock({
      fragments: [{ id: "old/010.md", hash: "sha256-aaa", bytes: 2, tags: [] }],
    });
    const next = makeLock();
    const diff = diffLock(base, next);
    expect(diff.changed).toBe(true);
    expect(diff.fragmentChanges.removed).toContain("old/010.md");
  });

  it("detects modified fragment hash", () => {
    const frag = { id: "a/010.md", hash: "sha256-old", bytes: 2, tags: [] };
    const base = makeLock({ fragments: [frag] });
    const next = makeLock({ fragments: [{ ...frag, hash: "sha256-new" }] });
    const diff = diffLock(base, next);
    expect(diff.changed).toBe(true);
    expect(diff.fragmentChanges.modified).toHaveLength(1);
    expect(diff.fragmentChanges.modified[0]).toContain("a/010.md");
  });

  it("detects added target", () => {
    const base = makeLock();
    const next = makeLock({
      targets: [{ output: "NEW.md", format: "markdown", fragments: [], version: "v1" }],
    });
    const diff = diffLock(base, next);
    expect(diff.changed).toBe(true);
    expect(diff.targetChanges.added).toContain("NEW.md");
  });

  it("detects modified target version", () => {
    const base = makeLock({
      targets: [{ output: "OUT.md", format: "markdown", fragments: [], version: "v1" }],
    });
    const next = makeLock({
      targets: [{ output: "OUT.md", format: "markdown", fragments: [], version: "v2" }],
    });
    const diff = diffLock(base, next);
    expect(diff.changed).toBe(true);
    expect(diff.targetChanges.modified).toHaveLength(1);
  });

  it("detects added agent", () => {
    const base = makeLock();
    const next = makeLock({
      agents: [{ name: "myagent", dir: "agents/myagent", bodyFragments: [], metaHash: "h1", version: "v1", outputs: {} }],
    });
    const diff = diffLock(base, next);
    expect(diff.changed).toBe(true);
    expect(diff.agentChanges.added).toContain("myagent");
  });
});
