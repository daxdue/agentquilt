import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { scanFragments, getFragmentsForTarget } from "../src/core/fragmentScanner";
import type { AgentQuiltConfig } from "../src/schemas/config.schema";

function makeConfig(sourceDir: string, includes: string[][]): AgentQuiltConfig {
  return {
    version: 1,
    sourceDir,
    targets: includes.map((include, i) => ({
      kind: "document" as const,
      output: `OUT${i}.md`,
      include,
      format: "markdown",
    })),
  };
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdirSync(path.join(os.tmpdir(), `aq-scan-${Date.now()}`), { recursive: true }) as unknown as string
    ?? path.join(os.tmpdir(), `aq-scan-${Date.now()}`);
  // mkdirSync with recursive returns the path or undefined depending on node version
  tmpDir = path.join(os.tmpdir(), `aq-scan-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("scanFragments", () => {
  it("returns fragments in byte-lex order with prefixed files before unprefixed", () => {
    const agentDir = path.join(tmpDir, "myagent");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, "020-b.md"), "B\n");
    writeFileSync(path.join(agentDir, "010-a.md"), "A\n");
    writeFileSync(path.join(agentDir, "readme.md"), "R\n"); // unprefixed

    const config = makeConfig(tmpDir, [["myagent"]]);
    const frags = scanFragments(config, tmpDir);

    expect(frags.map((f) => f.fileName)).toEqual(["010-a.md", "020-b.md", "readme.md"]);
  });

  it("returns empty array when agent directory has no .md files", () => {
    const agentDir = path.join(tmpDir, "empty");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, "notes.txt"), "ignored\n");

    const config = makeConfig(tmpDir, [["empty"]]);
    const frags = scanFragments(config, tmpDir);

    expect(frags).toHaveLength(0);
  });

  it("deduplicates a fragment id that appears in two includes of two different targets", () => {
    const sharedDir = path.join(tmpDir, "_shared");
    mkdirSync(sharedDir, { recursive: true });
    writeFileSync(path.join(sharedDir, "010-tone.md"), "Be concise.\n");

    // Both targets include _shared — scanFragments collapses via seenIds
    const config = makeConfig(tmpDir, [["_shared"], ["_shared"]]);
    const frags = scanFragments(config, tmpDir);

    // The fragment appears once even though two targets include the same dir
    expect(frags.filter((f) => f.fileName === "010-tone.md")).toHaveLength(1);
  });

  it("extracts front-matter tags without including them in the fragment body", () => {
    const agentDir = path.join(tmpDir, "ag");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, "010-tagged.md"), "---\ntags: [role, safety]\n---\nBody text.\n");

    const config = makeConfig(tmpDir, [["ag"]]);
    const frags = scanFragments(config, tmpDir);

    expect(frags).toHaveLength(1);
    expect(frags[0].tags).toEqual(["role", "safety"]);
  });

  it("sets hasPrefix=false and still includes unprefixed fragments", () => {
    const agentDir = path.join(tmpDir, "ag");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, "notes.md"), "Notes.\n");

    const config = makeConfig(tmpDir, [["ag"]]);
    const frags = scanFragments(config, tmpDir);

    expect(frags).toHaveLength(1);
    expect(frags[0].hasPrefix).toBe(false);
  });

  it("uses POSIX-style fragment id relative to sourceDir", () => {
    const agentDir = path.join(tmpDir, "myagent");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, "010-role.md"), "Role.\n");

    const config = makeConfig(tmpDir, [["myagent"]]);
    const frags = scanFragments(config, tmpDir);

    expect(frags[0].id).toBe("myagent/010-role.md");
  });
});

describe("getFragmentsForTarget", () => {
  it("returns only fragments belonging to that target's includes", () => {
    mkdirSync(path.join(tmpDir, "a"), { recursive: true });
    mkdirSync(path.join(tmpDir, "b"), { recursive: true });
    writeFileSync(path.join(tmpDir, "a", "010-x.md"), "X\n");
    writeFileSync(path.join(tmpDir, "b", "010-y.md"), "Y\n");

    const config = makeConfig(tmpDir, [["a"], ["b"]]);
    const allFrags = scanFragments(config, tmpDir);

    const target0Frags = getFragmentsForTarget(allFrags, config, 0);
    const target1Frags = getFragmentsForTarget(allFrags, config, 1);

    expect(target0Frags.map((f) => f.agentName)).toEqual(["a"]);
    expect(target1Frags.map((f) => f.agentName)).toEqual(["b"]);
  });

  it("returns fragments in include order for a multi-include target", () => {
    mkdirSync(path.join(tmpDir, "_shared"), { recursive: true });
    mkdirSync(path.join(tmpDir, "backend"), { recursive: true });
    writeFileSync(path.join(tmpDir, "_shared", "010-tone.md"), "Tone.\n");
    writeFileSync(path.join(tmpDir, "backend", "010-role.md"), "Role.\n");

    const config: AgentQuiltConfig = {
      version: 1,
      sourceDir: tmpDir,
      targets: [{
        kind: "document",
        output: "OUT.md",
        include: ["_shared", "backend"],
        format: "markdown",
      }],
    };
    const allFrags = scanFragments(config, tmpDir);
    const frags = getFragmentsForTarget(allFrags, config, 0);

    expect(frags[0].agentName).toBe("_shared");
    expect(frags[1].agentName).toBe("backend");
  });

  it("returns empty array for non-document target index", () => {
    const config: AgentQuiltConfig = {
      version: 1,
      sourceDir: tmpDir,
      targets: [{
        kind: "agent-definitions",
        agents: "*",
        platforms: ["claude"],
      }],
    };
    const frags = getFragmentsForTarget([], config, 0);
    expect(frags).toEqual([]);
  });
});
