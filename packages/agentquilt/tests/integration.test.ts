import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { compile } from "../src/core/compiler";
import { createLock, writeLock, readLock, diffLock } from "../src/core/lockWriter";
import { loadConfig, validateConfig } from "../src/core/configLoader";

let tmpDir: string;

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `aq-integ-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function scaffoldProject(dir: string) {
  const agentsDir = path.join(dir, "agents");
  mkdirSync(path.join(agentsDir, "_shared"), { recursive: true });
  mkdirSync(path.join(agentsDir, "backend"), { recursive: true });

  writeFileSync(path.join(agentsDir, "_shared", "010-tone.md"), "Be concise.\n");
  writeFileSync(path.join(agentsDir, "backend", "010-role.md"), "You are a backend agent.\n");

  writeFileSync(
    path.join(dir, "agentquilt.config.yaml"),
    [
      "version: 1",
      "sourceDir: agents",
      "targets:",
      "  - output: AGENTS.md",
      "    include: [_shared, backend]",
    ].join("\n"),
    "utf8"
  );
}

async function runBuild(dir: string) {
  const configPath = path.join(dir, "agentquilt.config.yaml");
  const config = loadConfig(configPath);
  const sourceDir = path.join(dir, config.sourceDir);
  validateConfig(config, sourceDir);

  const result = await compile(config, sourceDir);
  for (const target of result.targets) {
    writeFileSync(path.join(dir, target.output), target.content, "utf8");
  }

  const lock = createLock(result.fragmentMap, result.targets);
  writeLock(lock, path.join(dir, "agentquilt.lock"));
  return { result, lock };
}

describe("build → check pipeline", () => {
  it("build produces AGENTS.md and agentquilt.lock", async () => {
    scaffoldProject(tmpDir);
    const { result } = await runBuild(tmpDir);

    expect(result.targets).toHaveLength(1);
    const content = readFileSync(path.join(tmpDir, "AGENTS.md"), "utf8");
    expect(content).toContain("Be concise.");
    expect(content).toContain("You are a backend agent.");

    const lockContent = readFileSync(path.join(tmpDir, "agentquilt.lock"), "utf8");
    expect(() => JSON.parse(lockContent)).not.toThrow();
  });

  it("check detects no drift immediately after build", async () => {
    scaffoldProject(tmpDir);
    const { lock: builtLock } = await runBuild(tmpDir);

    // Re-run compile to simulate check
    const configPath = path.join(tmpDir, "agentquilt.config.yaml");
    const config = loadConfig(configPath);
    const sourceDir = path.join(tmpDir, config.sourceDir);
    const result = await compile(config, sourceDir);
    const newLock = createLock(result.fragmentMap, result.targets);

    // Compare output files
    let hasDrift = false;
    for (const target of result.targets) {
      const diskContent = readFileSync(path.join(tmpDir, target.output), "utf8");
      if (diskContent !== target.content) hasDrift = true;
    }

    // Compare locks
    const diskLock = readLock(path.join(tmpDir, "agentquilt.lock"));
    const diff = diffLock(diskLock!, newLock);

    expect(hasDrift).toBe(false);
    expect(diff.changed).toBe(false);

    // builtLock and newLock should be identical
    expect(newLock).toEqual(builtLock);
  });

  it("check detects drift when a generated file is manually edited", async () => {
    scaffoldProject(tmpDir);
    await runBuild(tmpDir);

    // Manually corrupt the output
    writeFileSync(path.join(tmpDir, "AGENTS.md"), "manually edited\n", "utf8");

    const configPath = path.join(tmpDir, "agentquilt.config.yaml");
    const config = loadConfig(configPath);
    const sourceDir = path.join(tmpDir, config.sourceDir);
    const result = await compile(config, sourceDir);

    let hasDrift = false;
    for (const target of result.targets) {
      const diskContent = readFileSync(path.join(tmpDir, target.output), "utf8");
      if (diskContent !== target.content) hasDrift = true;
    }

    expect(hasDrift).toBe(true);
  });

  it("check detects drift when a fragment is modified after build", async () => {
    scaffoldProject(tmpDir);
    await runBuild(tmpDir);

    // Modify a source fragment
    writeFileSync(
      path.join(tmpDir, "agents", "_shared", "010-tone.md"),
      "Be very concise.\n",
      "utf8"
    );

    const configPath = path.join(tmpDir, "agentquilt.config.yaml");
    const config = loadConfig(configPath);
    const sourceDir = path.join(tmpDir, config.sourceDir);
    const result = await compile(config, sourceDir);
    const newLock = createLock(result.fragmentMap, result.targets);
    const diskLock = readLock(path.join(tmpDir, "agentquilt.lock"));
    const diff = diffLock(diskLock!, newLock);

    expect(diff.changed).toBe(true);
    expect(diff.fragmentChanges.modified).toHaveLength(1);
  });

  it("preset: claude auto-fills output as CLAUDE.md", async () => {
    mkdirSync(path.join(tmpDir, "agents", "myagent"), { recursive: true });
    writeFileSync(path.join(tmpDir, "agents", "myagent", "010-role.md"), "Role.\n");
    writeFileSync(
      path.join(tmpDir, "agentquilt.config.yaml"),
      [
        "version: 1",
        "sourceDir: agents",
        "targets:",
        "  - preset: claude",
        "    include: [myagent]",
      ].join("\n"),
      "utf8"
    );

    const { result } = await runBuild(tmpDir);
    expect(result.targets[0].output).toBe("CLAUDE.md");
    const content = readFileSync(path.join(tmpDir, "CLAUDE.md"), "utf8");
    expect(content).toContain("Role.");
  });
});
