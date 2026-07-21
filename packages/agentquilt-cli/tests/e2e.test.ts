/**
 * End-to-end tests that invoke the compiled CLI binary as a subprocess.
 *
 * These tests verify behaviour at the process boundary — correct exit codes,
 * files written to disk, and security invariants — without importing any
 * internal modules.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "child_process";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  symlinkSync,
  chmodSync,
} from "fs";
import { basename, join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { fragmentHash, normalize } from "../src/core/normalize.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CLI_BIN = fileURLToPath(new URL("../dist/index.js", import.meta.url));

function runCLI(
  args: string[],
  options: { cwd?: string } = {}
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [CLI_BIN, ...args], {
    cwd: options.cwd,
    encoding: "utf8",
    timeout: 20_000,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function outputHash(content: string): string {
  return `sha256-${createHash("sha256").update(content, "utf8").digest("hex")}`;
}

/** Write a minimal valid `.agentquilt/config.yaml` + one fragment into `dir`. */
function setupMinimalProject(dir: string): void {
  const sharedDir = join(dir, ".agentquilt", "agents", "_shared");
  mkdirSync(sharedDir, { recursive: true });
  writeFileSync(join(sharedDir, "010-tone.md"), "Be concise.\n", "utf8");
  writeFileSync(
    join(dir, ".agentquilt", "config.yaml"),
    [
      "version: 1",
      "sourceDir: .agentquilt/agents",
      "targets:",
      "  - output: AGENTS.md",
      "    include: [_shared]",
    ].join("\n") + "\n",
    "utf8"
  );
}

/** Write a minimal Codex agent-definition project into `dir`. */
function setupCodexAgentProject(
  dir: string,
  manifest: string,
  body = "You are a helper.\n"
): void {
  const agentDir = join(dir, ".agentquilt", "agents", "helper");
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, "agent.yaml"), manifest, "utf8");
  writeFileSync(join(agentDir, "010-role.md"), body, "utf8");
  writeFileSync(
    join(dir, ".agentquilt", "config.yaml"),
    [
      "version: 1",
      "sourceDir: .agentquilt/agents",
      "targets:",
      "  - kind: agent-definitions",
      "    agents: [helper]",
      "    platforms: [codex]",
    ].join("\n") + "\n",
    "utf8"
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "aq-e2e-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// --version stays in sync with package.json (regression: it was hardcoded
// to a stale literal, silently wrong across 0.1.0/0.1.1, until fixed).
// ---------------------------------------------------------------------------

describe("--version", () => {
  it("matches package.json's version field, not a hardcoded literal", () => {
    const packageJsonPath = fileURLToPath(
      new URL("../package.json", import.meta.url)
    );
    const { version } = JSON.parse(readFileSync(packageJsonPath, "utf8"));

    const result = runCLI(["--version"]);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(version);
  });
});

// ---------------------------------------------------------------------------
// Scenario 1: init on an empty directory
// ---------------------------------------------------------------------------

describe("init: empty directory", () => {
  it("exits 0 and creates the expected scaffold", () => {
    const result = runCLI(["init", "--dir", tmpDir, "--platform", "claude"]);

    expect(result.status).toBe(0);
    expect(existsSync(join(tmpDir, ".agentquilt", "config.yaml"))).toBe(true);
    expect(existsSync(join(tmpDir, ".agentquilt", "agents"))).toBe(true);
    expect(existsSync(join(tmpDir, ".gitattributes"))).toBe(true);
  });

  it("initializes, builds, and checks a Codex agent project", () => {
    expect(runCLI(["init", "--dir", tmpDir, "--platform", "codex"]).status).toBe(0);
    expect(runCLI(["agents", "add", "helper", "--cwd", tmpDir]).status).toBe(0);

    const build = runCLI(["build", "--cwd", tmpDir, "--quiet"]);
    const outputPath = join(tmpDir, ".codex", "agents", "helper.toml");

    expect(build.status).toBe(0);
    expect(existsSync(outputPath)).toBe(true);
    expect(readFileSync(outputPath, "utf8")).toContain('name = "helper"');
    expect(runCLI(["check", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
  });

  it("fans one agent out to Claude and Codex with sorted exact lock hashes", () => {
    expect(
      runCLI(["init", "--dir", tmpDir, "--platform", "claude,codex"]).status
    ).toBe(0);
    expect(runCLI(["agents", "add", "helper", "--cwd", tmpDir]).status).toBe(0);
    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(0);

    const claudePath = join(tmpDir, ".claude", "agents", "helper.md");
    const codexPath = join(tmpDir, ".codex", "agents", "helper.toml");
    const lockPath = join(tmpDir, "agentquilt" + ".lock");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    const outputs = lock.agents[0].outputs;

    expect(outputs.map((output: any) => [output.platform, output.path])).toEqual([
      ["claude", ".claude" + "/agents/helper.md"],
      ["codex", ".codex/agents/helper.toml"],
    ]);
    expect(outputs[0].hash).toBe(outputHash(readFileSync(claudePath, "utf8")));
    expect(outputs[1].hash).toBe(outputHash(readFileSync(codexPath, "utf8")));
    expect(runCLI(["check", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
  });

  it("preserves existing Codex config and requires force to claim an agent file", () => {
    const codexDir = join(tmpDir, ".codex");
    const agentsDir = join(codexDir, "agents");
    const configPath = join(codexDir, "config.toml");
    const outputPath = join(agentsDir, "helper.toml");
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(configPath, 'model = "user-selected"\n', "utf8");
    writeFileSync(outputPath, 'name = "hand-authored"\n', "utf8");

    const init = runCLI(["init", "--dir", tmpDir, "--platform", "codex"]);
    expect(init.status).toBe(0);
    expect(init.stderr).toContain("existing Codex agents are not adopted");
    expect(runCLI(["agents", "add", "helper", "--cwd", tmpDir]).status).toBe(0);

    const blocked = runCLI(["build", "--cwd", tmpDir]);
    expect(blocked.status).toBe(1);
    expect(blocked.stderr).toContain("existing user-owned file is not yet claimed");
    expect(readFileSync(outputPath, "utf8")).toBe('name = "hand-authored"\n');
    expect(readFileSync(configPath, "utf8")).toBe('model = "user-selected"\n');

    expect(runCLI(["build", "--cwd", tmpDir, "--quiet", "--force"]).status).toBe(0);
    expect(readFileSync(outputPath, "utf8")).toContain('name = "helper"');
    expect(readFileSync(configPath, "utf8")).toBe('model = "user-selected"\n');
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: init with pre-existing .claude/agents (adoption path)
// ---------------------------------------------------------------------------

describe("init: adoption of existing agents", () => {
  it("adopts existing .claude/agents and does not clobber hand-authored source files", () => {
    // A Claude agent that should be adopted into the AgentQuilt source tree.
    const claudeDir = join(tmpDir, ".claude", "agents");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      join(claudeDir, "helper.md"),
      "---\nname: helper\ndescription: Helps out\nmodel: sonnet\n---\n\nYou are a helper.\n",
      "utf8"
    );

    // A hand-authored source file that must NOT be overwritten by adoption.
    // We create the directory but not config.yaml so init still proceeds.
    const keeperDir = join(tmpDir, ".agentquilt", "agents", "keeper");
    mkdirSync(keeperDir, { recursive: true });
    writeFileSync(join(keeperDir, "agent.yaml"), "description: hand-authored\n", "utf8");

    const result = runCLI(["init", "--dir", tmpDir, "--platform", "claude"]);
    expect(result.status).toBe(0);

    // Adoption: helper fragment sources should exist
    const helperYaml = join(tmpDir, ".agentquilt", "agents", "helper", "agent.yaml");
    expect(existsSync(helperYaml)).toBe(true);
    expect(readFileSync(helperYaml, "utf8")).toContain("model: balanced");

    // Non-clobber: keeper's hand-authored content unchanged
    expect(readFileSync(join(keeperDir, "agent.yaml"), "utf8")).toBe(
      "description: hand-authored\n"
    );
  });

  it("adopts a Claude model into a mixed project that builds and checks", () => {
    const claudeDir = join(tmpDir, ".claude", "agents");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      join(claudeDir, "helper.md"),
      "---\nname: helper\ndescription: Helps out\nmodel: sonnet\n---\n\nYou are a helper.\n",
      "utf8"
    );

    expect(
      runCLI(["init", "--dir", tmpDir, "--platform", "claude,codex"]).status
    ).toBe(0);

    const manifest = readFileSync(
      join(tmpDir, ".agentquilt", "agents", "helper", "agent.yaml"),
      "utf8"
    );
    expect(manifest).toContain(
      'model:\n  overrides:\n    claude: "sonnet"\n'
    );

    const build = runCLI(["build", "--cwd", tmpDir, "--quiet"]);
    expect(build.status).toBe(0);

    const claudeOutput = readFileSync(
      join(tmpDir, ".claude", "agents", "helper.md"),
      "utf8"
    );
    const codexOutput = readFileSync(
      join(tmpDir, ".codex", "agents", "helper.toml"),
      "utf8"
    );
    expect(claudeOutput).toMatch(/^model: sonnet$/m);
    expect(codexOutput).not.toMatch(/^model\s*=/m);
    expect(runCLI(["check", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: build produces expected outputs and is byte-stable (idempotent)
// ---------------------------------------------------------------------------

describe("build: produces outputs and is idempotent", () => {
  beforeEach(() => setupMinimalProject(tmpDir));

  it("exits 0 and writes AGENTS.md containing fragment content plus a lock file", () => {
    const result = runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    expect(result.status).toBe(0);
    expect(existsSync(join(tmpDir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(tmpDir, "agentquilt.lock"))).toBe(true);
    expect(readFileSync(join(tmpDir, "AGENTS.md"), "utf8")).toContain("Be concise.");
  });

  it("second build produces byte-identical outputs (idempotent)", () => {
    runCLI(["build", "--cwd", tmpDir, "--quiet"]);
    const firstAgents = readFileSync(join(tmpDir, "AGENTS.md"), "utf8");
    const firstLock = readFileSync(join(tmpDir, "agentquilt.lock"), "utf8");

    runCLI(["build", "--cwd", tmpDir, "--quiet"]);
    expect(readFileSync(join(tmpDir, "AGENTS.md"), "utf8")).toBe(firstAgents);
    expect(readFileSync(join(tmpDir, "agentquilt.lock"), "utf8")).toBe(firstLock);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: check exit codes
// ---------------------------------------------------------------------------

describe("check: exits 0 after a clean build", () => {
  it("check exits 0 when source matches the last build", () => {
    setupMinimalProject(tmpDir);
    runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    const result = runCLI(["check", "--cwd", tmpDir, "--quiet"]);
    expect(result.status).toBe(0);
  });
});

describe("check: exits 1 when source has drifted since last build", () => {
  it("detects a fragment changed after the build", () => {
    setupMinimalProject(tmpDir);
    runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    // Mutate source after the build
    writeFileSync(
      join(tmpDir, ".agentquilt", "agents", "_shared", "010-tone.md"),
      "Be verbose.\n",
      "utf8"
    );

    const result = runCLI(["check", "--cwd", tmpDir, "--quiet"]);
    expect(result.status).toBe(1);
  });
});

describe("check: detects drift in compiled agent-definitions outputs", () => {
  /** Minimal project with one agent compiled to .claude/agents/helper.md. */
  function setupAgentProject(dir: string): void {
    const agentDir = join(dir, ".agentquilt", "agents", "helper");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "agent.yaml"), "description: Helps out\n", "utf8");
    writeFileSync(join(agentDir, "010-role.md"), "You are a helper.\n", "utf8");
    writeFileSync(
      join(dir, ".agentquilt", "config.yaml"),
      [
        "version: 1",
        "sourceDir: .agentquilt/agents",
        "targets:",
        "  - kind: agent-definitions",
        '    agents: "*"',
        "    platforms: [claude]",
      ].join("\n") + "\n",
      "utf8"
    );
  }

  it("exits 1 when a compiled agent output was hand-edited after the build", () => {
    setupAgentProject(tmpDir);
    runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    const compiledPath = join(tmpDir, ".claude", "agents", "helper.md");
    expect(existsSync(compiledPath)).toBe(true);
    writeFileSync(compiledPath, readFileSync(compiledPath, "utf8") + "TAMPERED\n", "utf8");

    const result = runCLI(["check", "--cwd", tmpDir]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("helper.md");
    expect(result.stderr).toContain("content differs");
  });

  it("exits 1 when a compiled agent output was deleted after the build", () => {
    setupAgentProject(tmpDir);
    runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    rmSync(join(tmpDir, ".claude", "agents", "helper.md"));

    const result = runCLI(["check", "--cwd", tmpDir]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("does not exist");
  });

  it("exits 0 when compiled agent outputs match the last build", () => {
    setupAgentProject(tmpDir);
    runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    const result = runCLI(["check", "--cwd", tmpDir, "--quiet"]);
    expect(result.status).toBe(0);
  });
});

describe("build: merges one canonical agent across separate provider targets", () => {
  it("writes both providers and one consolidated lock record", () => {
    const agentDir = join(tmpDir, ".agentquilt", "agents", "helper");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "agent.yaml"), "description: Helper\nmodel: inherit\n", "utf8");
    writeFileSync(join(agentDir, "010-role.md"), "Help.\n", "utf8");
    writeFileSync(
      join(tmpDir, ".agentquilt", "config.yaml"),
      [
        "version: 1",
        "sourceDir: .agentquilt/agents",
        "targets:",
        "  - kind: agent-definitions",
        "    agents: [helper]",
        "    platforms: [claude]",
        "  - kind: agent-definitions",
        "    agents: [helper]",
        "    platforms: [codex]",
      ].join("\n") + "\n",
      "utf8"
    );

    const result = runCLI(["build", "--cwd", tmpDir]);

    expect(result.status).toBe(0);
    expect(existsSync(join(tmpDir, ".claude", "agents", "helper.md"))).toBe(true);
    expect(existsSync(join(tmpDir, ".codex", "agents", "helper.toml"))).toBe(true);
    const lock = JSON.parse(
      readFileSync(join(tmpDir, "agentquilt" + ".lock"), "utf8")
    );
    expect(lock.agents).toHaveLength(1);
    expect(lock.agents[0].outputs).toHaveLength(2);
    expect(runCLI(["check", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
  });
});

describe("build: refuses to overwrite generated files hand-edited since the last build", () => {
  function setupAgentProject(dir: string): void {
    const agentDir = join(dir, ".agentquilt", "agents", "helper");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "agent.yaml"), "description: Helps out\n", "utf8");
    writeFileSync(join(agentDir, "010-role.md"), "You are a helper.\n", "utf8");
    writeFileSync(
      join(dir, ".agentquilt", "config.yaml"),
      [
        "version: 1",
        "sourceDir: .agentquilt/agents",
        "targets:",
        "  - kind: agent-definitions",
        '    agents: "*"',
        "    platforms: [claude]",
      ].join("\n") + "\n",
      "utf8"
    );
  }

  it("blocks a hand-edited document target (exit 1) and leaves the manual edit in place", () => {
    setupMinimalProject(tmpDir);
    runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    const outputPath = join(tmpDir, "AGENTS.md");
    const original = readFileSync(outputPath, "utf8");
    writeFileSync(outputPath, original + "MANUAL EDIT\n", "utf8");

    const result = runCLI(["build", "--cwd", tmpDir, "--quiet"]);
    expect(result.status).toBe(1);
    expect(readFileSync(outputPath, "utf8")).toContain("MANUAL EDIT");
  });

  it("--force discards the manual edit and rebuilds the document target (exit 0)", () => {
    setupMinimalProject(tmpDir);
    runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    const outputPath = join(tmpDir, "AGENTS.md");
    const original = readFileSync(outputPath, "utf8");
    writeFileSync(outputPath, original + "MANUAL EDIT\n", "utf8");

    const result = runCLI(["build", "--cwd", tmpDir, "--quiet", "--force"]);
    expect(result.status).toBe(0);
    expect(readFileSync(outputPath, "utf8")).not.toContain("MANUAL EDIT");

    expect(runCLI(["check", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
  });

  it("blocks a hand-edited compiled agent output (exit 1) and leaves the manual edit in place", () => {
    setupAgentProject(tmpDir);
    runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    const outputPath = join(tmpDir, ".claude", "agents", "helper.md");
    writeFileSync(outputPath, readFileSync(outputPath, "utf8") + "TAMPERED\n", "utf8");

    const result = runCLI(["build", "--cwd", tmpDir, "--quiet"]);
    expect(result.status).toBe(1);
    expect(readFileSync(outputPath, "utf8")).toContain("TAMPERED");
  });

  it("recognizes a legacy normalized output hash during upgrade", () => {
    setupAgentProject(tmpDir);
    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
    const outputPath = join(tmpDir, ".claude", "agents", "helper.md");
    const lockPath = join(tmpDir, "agentquilt" + ".lock");
    const original = readFileSync(outputPath, "utf8");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.agents[0].outputs[0].hash = fragmentHash(
      normalize(Buffer.from(original, "utf8"))
    );
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n", "utf8");
    writeFileSync(outputPath, original + "TAMPERED\n", "utf8");

    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(1);
    expect(readFileSync(outputPath, "utf8")).toContain("TAMPERED");
  });

  it("allows a metadata-only source edit while upgrading a legacy output hash", () => {
    setupAgentProject(tmpDir);
    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
    const outputPath = join(tmpDir, ".claude", "agents", "helper.md");
    const manifestPath = join(
      tmpDir,
      ".agentquilt",
      "agents",
      "helper",
      "agent.yaml"
    );
    const lockPath = join(tmpDir, "agentquilt" + ".lock");
    const original = readFileSync(outputPath, "utf8");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.agents[0].outputs[0].hash = fragmentHash(
      normalize(Buffer.from(original, "utf8"))
    );
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n", "utf8");
    writeFileSync(manifestPath, "description: Updated helper description\n", "utf8");

    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
    expect(readFileSync(outputPath, "utf8")).toContain(
      "description: Updated helper description"
    );
    expect(runCLI(["check", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
  });

  it("upgrades a legacy region output record to deterministic file-only output", () => {
    setupCodexAgentProject(tmpDir, "description: Helper\nmodel: inherit\n");
    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
    const lockPath = join(tmpDir, "agentquilt" + ".lock");
    const legacyLock = JSON.parse(readFileSync(lockPath, "utf8"));
    legacyLock.agents[0].outputs[0].kind = "region";
    writeFileSync(lockPath, JSON.stringify(legacyLock, null, 2) + "\n", "utf8");

    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
    const upgradedBytes = readFileSync(lockPath, "utf8");
    const upgradedLock = JSON.parse(upgradedBytes);
    expect(upgradedLock.agents[0].outputs[0].kind).toBe("file");
    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
    expect(readFileSync(lockPath, "utf8")).toBe(upgradedBytes);
    expect(runCLI(["check", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
  });

  it("blocks the first claim of a differing provider file", () => {
    setupAgentProject(tmpDir);
    const outputDir = join(tmpDir, ".claude", "agents");
    const outputPath = join(outputDir, "helper.md");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(outputPath, "HAND AUTHORED\n", "utf8");

    const result = runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    expect(result.status).toBe(1);
    expect(readFileSync(outputPath, "utf8")).toBe("HAND AUTHORED\n");
  });

  it("does not acquire a blocked provider path after a later source edit", () => {
    setupAgentProject(tmpDir);
    const outputDir = join(tmpDir, ".claude", "agents");
    const outputPath = join(outputDir, "helper.md");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(outputPath, "HAND AUTHORED\n", "utf8");

    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(1);
    writeFileSync(
      join(tmpDir, ".agentquilt", "agents", "helper", "010-role.md"),
      "Changed source.\n",
      "utf8"
    );
    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(1);
    expect(readFileSync(outputPath, "utf8")).toBe("HAND AUTHORED\n");
  });

  it("preflights a blocked first claim before writing any other output", () => {
    const sharedDir = join(tmpDir, ".agentquilt", "agents", "_shared");
    const agentDir = join(tmpDir, ".agentquilt", "agents", "helper");
    const configPath = join(tmpDir, ".agentquilt", "config.yaml");
    mkdirSync(sharedDir, { recursive: true });
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(sharedDir, "010-tone.md"), "Original guide.\n", "utf8");
    writeFileSync(join(agentDir, "agent.yaml"), "description: Helper\nmodel: inherit\n", "utf8");
    writeFileSync(join(agentDir, "010-role.md"), "Help.\n", "utf8");
    const makeConfig = (platforms: string) =>
      [
        "version: 1",
        "sourceDir: .agentquilt/agents",
        "targets:",
        "  - output: GUIDE.md",
        "    include: [_shared]",
        "  - kind: agent-definitions",
        "    agents: [helper]",
        `    platforms: [${platforms}]`,
      ].join("\n") + "\n";
    writeFileSync(configPath, makeConfig("claude"), "utf8");
    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(0);

    const guidePath = join(tmpDir, "GUIDE.md");
    const lockPath = join(tmpDir, "agentquilt" + ".lock");
    const originalGuide = readFileSync(guidePath, "utf8");
    const originalLock = readFileSync(lockPath, "utf8");
    writeFileSync(join(sharedDir, "010-tone.md"), "Changed guide.\n", "utf8");
    writeFileSync(configPath, makeConfig("claude, codex"), "utf8");
    const codexDir = join(tmpDir, ".codex", "agents");
    mkdirSync(codexDir, { recursive: true });
    writeFileSync(join(codexDir, "helper.toml"), "HAND AUTHORED\n", "utf8");

    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(1);
    expect(readFileSync(guidePath, "utf8")).toBe(originalGuide);
    expect(readFileSync(lockPath, "utf8")).toBe(originalLock);
  });

  it("blocks an edited provider output after unrelated provider metadata changes", () => {
    expect(
      runCLI(["init", "--dir", tmpDir, "--platform", "claude,codex"]).status
    ).toBe(0);
    expect(runCLI(["agents", "add", "helper", "--cwd", tmpDir]).status).toBe(0);
    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(0);

    const claudePath = join(tmpDir, ".claude", "agents", "helper.md");
    const manifestPath = join(
      tmpDir,
      ".agentquilt",
      "agents",
      "helper",
      "agent.yaml"
    );
    writeFileSync(claudePath, readFileSync(claudePath, "utf8") + "TAMPERED\n", "utf8");
    writeFileSync(
      manifestPath,
      readFileSync(manifestPath, "utf8") + "x-codex:\n  nickname_candidates: [Ada]\n",
      "utf8"
    );

    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(1);
    expect(readFileSync(claudePath, "utf8")).toContain("TAMPERED");
  });

  it("allows --force to claim a differing provider file", () => {
    setupAgentProject(tmpDir);
    const outputDir = join(tmpDir, ".claude", "agents");
    const outputPath = join(outputDir, "helper.md");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(outputPath, "HAND AUTHORED\n", "utf8");

    const result = runCLI(["build", "--cwd", tmpDir, "--quiet", "--force"]);

    expect(result.status).toBe(0);
    expect(readFileSync(outputPath, "utf8")).not.toContain("HAND AUTHORED");
    expect(runCLI(["check", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
  });

  it("accepts a first claim when existing bytes already match", () => {
    setupAgentProject(tmpDir);
    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
    rmSync(join(tmpDir, "agentquilt" + ".lock"));

    const result = runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    expect(result.status).toBe(0);
    expect(runCLI(["check", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
  });

  it("does not block a legitimate rebuild after a fragment source edit", () => {
    setupMinimalProject(tmpDir);
    runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    writeFileSync(
      join(tmpDir, ".agentquilt", "agents", "_shared", "010-tone.md"),
      "Be verbose.\n",
      "utf8"
    );

    const result = runCLI(["build", "--cwd", tmpDir, "--quiet"]);
    expect(result.status).toBe(0);
    expect(readFileSync(join(tmpDir, "AGENTS.md"), "utf8")).toContain("Be verbose.");
    expect(runCLI(["check", "--cwd", tmpDir, "--quiet"]).status).toBe(0);
  });
});

describe("check: exits 2 on an invalid config", () => {
  it("rejects a config with wrong field types", () => {
    mkdirSync(join(tmpDir, ".agentquilt"), { recursive: true });
    writeFileSync(
      join(tmpDir, ".agentquilt", "config.yaml"),
      "version: not-a-number\nsourceDir: 42\n",
      "utf8"
    );

    const result = runCLI(["check", "--cwd", tmpDir, "--quiet"]);
    expect(result.status).toBe(2);
  });
});

describe("Codex validation failures at the CLI boundary", () => {
  it("exits 2 without replacing an existing output or lock for invalid skills.config", () => {
    const manifestPath = join(
      tmpDir,
      ".agentquilt",
      "agents",
      "helper",
      "agent.yaml"
    );
    const outputPath = join(tmpDir, ".codex", "agents", "helper.toml");
    const lockPath = join(tmpDir, "agentquilt" + ".lock");
    setupCodexAgentProject(tmpDir, "description: Helps out\nmodel: inherit\n");
    expect(runCLI(["build", "--cwd", tmpDir, "--quiet"]).status).toBe(0);

    const originalOutput = readFileSync(outputPath, "utf8");
    const originalLock = readFileSync(lockPath, "utf8");
    writeFileSync(
      manifestPath,
      [
        "description: Helps out",
        "model: inherit",
        "x-codex:",
        "  skills:",
        "    config:",
        "      alpha: true",
      ].join("\n") + "\n",
      "utf8"
    );

    const build = runCLI(["build", "--cwd", tmpDir, "--quiet"]);
    expect(build.status).toBe(2);
    expect(build.stderr).toContain('Agent "helper"');
    expect(build.stderr).toContain("x-codex.skills.config");
    expect(readFileSync(outputPath, "utf8")).toBe(originalOutput);
    expect(readFileSync(lockPath, "utf8")).toBe(originalLock);

    const check = runCLI(["check", "--cwd", tmpDir, "--quiet"]);
    expect(check.status).toBe(2);
    expect(check.stderr).toContain('Agent "helper"');
    expect(check.stderr).toContain("x-codex.skills.config");
    expect(readFileSync(outputPath, "utf8")).toBe(originalOutput);
    expect(readFileSync(lockPath, "utf8")).toBe(originalLock);
  });

  it("exits 2 without creating output or lock for blank developer instructions", () => {
    setupCodexAgentProject(
      tmpDir,
      "description: Helps out\nmodel: inherit\n",
      "  \n\t\n"
    );
    const outputPath = join(tmpDir, ".codex", "agents", "helper.toml");
    const lockPath = join(tmpDir, "agentquilt" + ".lock");

    const build = runCLI(["build", "--cwd", tmpDir, "--quiet"]);
    expect(build.status).toBe(2);
    expect(build.stderr).toContain('Agent "helper"');
    expect(build.stderr).toContain("developer_instructions");
    expect(existsSync(outputPath)).toBe(false);
    expect(existsSync(lockPath)).toBe(false);

    const check = runCLI(["check", "--cwd", tmpDir, "--quiet"]);
    expect(check.status).toBe(2);
    expect(check.stderr).toContain('Agent "helper"');
    expect(check.stderr).toContain("developer_instructions");
    expect(existsSync(outputPath)).toBe(false);
    expect(existsSync(lockPath)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: security — path traversal via agent name fields
// ---------------------------------------------------------------------------

describe("security: path traversal via `agents add` name argument", () => {
  it("rejects a traversal name and does not create files outside the agents directory", () => {
    // "../../evil" with sourceDir=.agentquilt/agents resolves to tmpDir/evil —
    // still outside the intended agents dir even though inside tmpDir.
    const result = runCLI(["agents", "add", "../../evil", "--cwd", tmpDir]);

    expect(result.status).not.toBe(0);
    // No escape target created
    expect(existsSync(join(tmpDir, "evil"))).toBe(false);
  });
});

describe("security: path traversal via `skills add` name argument", () => {
  it("rejects a traversal name and does not create files outside the skills directory", () => {
    const result = runCLI(["skills", "add", "../../evil", "--cwd", tmpDir]);

    expect(result.status).not.toBe(0);
    expect(existsSync(join(tmpDir, "evil"))).toBe(false);
  });
});

describe("security: path traversal via agent-definition selector", () => {
  it("rejects a target source root symlinked outside for build, check, and watch", () => {
    const outsideDir = mkdtempSync(join(tmpdir(), "aq-e2e-linked-root-"));
    try {
      const outsideAgent = join(outsideDir, "helper");
      const aqDir = join(tmpDir, ".agentquilt");
      mkdirSync(outsideAgent, { recursive: true });
      mkdirSync(join(aqDir, "agents"), { recursive: true });
      writeFileSync(join(outsideAgent, "agent.yaml"), "description: Outside\n", "utf8");
      writeFileSync(join(outsideAgent, "010-role.md"), "Sensitive\n", "utf8");
      symlinkSync(outsideDir, join(aqDir, "linked-root"), "dir");
      writeFileSync(
        join(aqDir, "config.yaml"),
        [
          "version: 1",
          "sourceDir: .agentquilt/agents",
          "targets:",
          "  - kind: agent-definitions",
          "    sourceDir: linked-root",
          '    agents: "*"',
          "    platforms: [codex]",
        ].join("\n") + "\n",
        "utf8"
      );

      for (const commandArgs of [["build"], ["check"], ["build", "--watch"]]) {
        const result = runCLI([...commandArgs, "--cwd", tmpDir, "--quiet"]);
        expect(result.status).toBe(2);
        expect(result.stderr).toContain("sourceDir escapes the repository through a symlink");
      }
      expect(existsSync(join(tmpDir, ".codex", "agents", "helper.toml"))).toBe(false);
      expect(existsSync(join(tmpDir, "agentquilt" + ".lock"))).toBe(false);
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("does not enter watch mode when a wildcard sourceDir escapes the repository", () => {
    const outsideDir = mkdtempSync(join(tmpdir(), "aq-e2e-watch-outside-"));
    try {
      mkdirSync(join(tmpDir, ".agentquilt", "agents"), { recursive: true });
      writeFileSync(
        join(tmpDir, ".agentquilt", "config.yaml"),
        [
          "version: 1",
          "sourceDir: .agentquilt/agents",
          "targets:",
          "  - kind: agent-definitions",
          `    sourceDir: ${outsideDir}`,
          '    agents: "*"',
          "    platforms: [codex]",
        ].join("\n") + "\n",
        "utf8"
      );

      const result = runCLI(["build", "--watch", "--cwd", tmpDir, "--quiet"]);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("sourceDir escapes the repository");
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("exits 2 when a target-specific sourceDir escapes the repository", () => {
    const outsideDir = mkdtempSync(join(tmpdir(), "aq-e2e-outside-"));
    try {
      const agentDir = join(outsideDir, "helper");
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(join(agentDir, "agent.yaml"), "description: Outside\n", "utf8");
      writeFileSync(join(agentDir, "010-role.md"), "Sensitive local text.\n", "utf8");
      mkdirSync(join(tmpDir, ".agentquilt", "agents"), { recursive: true });
      writeFileSync(
        join(tmpDir, ".agentquilt", "config.yaml"),
        [
          "version: 1",
          "sourceDir: .agentquilt/agents",
          "targets:",
          "  - kind: agent-definitions",
          `    sourceDir: ${outsideDir}`,
          "    agents: [helper]",
          "    platforms: [codex]",
        ].join("\n") + "\n",
        "utf8"
      );

      const result = runCLI(["build", "--cwd", tmpDir, "--quiet"]);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("sourceDir escapes the repository");
      expect(existsSync(join(tmpDir, ".codex", "agents", "helper.toml"))).toBe(false);
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("exits 2 without compiling an agent outside the target source directory", () => {
    const aqDir = join(tmpDir, ".agentquilt");
    const agentsDir = join(aqDir, "agents");
    const outsideDir = join(aqDir, "outside-agent");
    mkdirSync(agentsDir, { recursive: true });
    mkdirSync(outsideDir, { recursive: true });
    writeFileSync(join(outsideDir, "agent.yaml"), "description: Outside\n", "utf8");
    writeFileSync(join(outsideDir, "010-role.md"), "Sensitive local text.\n", "utf8");
    writeFileSync(
      join(aqDir, "config.yaml"),
      [
        "version: 1",
        "sourceDir: .agentquilt/agents",
        "targets:",
        "  - kind: agent-definitions",
        "    agents: [../outside-agent]",
        "    platforms: [codex]",
      ].join("\n") + "\n",
      "utf8"
    );

    const result = runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("path traversal");
    expect(existsSync(join(tmpDir, ".codex", "agents", "outside-agent.toml"))).toBe(false);
  });

  it("exits 2 without following an in-root symlink to an outside agent", () => {
    const aqDir = join(tmpDir, ".agentquilt");
    const agentsDir = join(aqDir, "agents");
    const outsideDir = join(tmpDir, "outside-agent");
    mkdirSync(agentsDir, { recursive: true });
    mkdirSync(outsideDir, { recursive: true });
    writeFileSync(join(outsideDir, "agent.yaml"), "description: Outside\n", "utf8");
    writeFileSync(join(outsideDir, "010-role.md"), "Sensitive local text.\n", "utf8");
    symlinkSync(outsideDir, join(agentsDir, "external"), "dir");
    writeFileSync(
      join(aqDir, "config.yaml"),
      [
        "version: 1",
        "sourceDir: .agentquilt/agents",
        "targets:",
        "  - kind: agent-definitions",
        "    agents: [external]",
        "    platforms: [codex]",
      ].join("\n") + "\n",
      "utf8"
    );

    const result = runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("symlink traversal");
    expect(existsSync(join(tmpDir, ".codex", "agents", "external.toml"))).toBe(false);
  });

  it("exits 2 without following an agent fragment symlink outside its directory", () => {
    const aqDir = join(tmpDir, ".agentquilt");
    const agentDir = join(aqDir, "agents", "helper");
    const outsideFragment = join(tmpDir, "outside-fragment.md");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, "agent.yaml"), "description: Helper\n", "utf8");
    writeFileSync(outsideFragment, "Sensitive local text.\n", "utf8");
    symlinkSync(outsideFragment, join(agentDir, "010-role.md"), "file");
    writeFileSync(
      join(aqDir, "config.yaml"),
      [
        "version: 1",
        "sourceDir: .agentquilt/agents",
        "targets:",
        "  - kind: agent-definitions",
        "    agents: [helper]",
        "    platforms: [codex]",
      ].join("\n") + "\n",
      "utf8"
    );

    const result = runCLI(["build", "--cwd", tmpDir, "--quiet"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Agent file escapes its directory");
    expect(existsSync(join(tmpDir, ".codex", "agents", "helper.toml"))).toBe(false);
  });
});

describe("watch: initial failure exit codes", () => {
  it("preserves the I/O exit code when the initial watch build cannot read a source", () => {
    setupMinimalProject(tmpDir);
    const fragmentPath = join(
      tmpDir,
      ".agentquilt",
      "agents",
      "_shared",
      "010-tone.md"
    );
    chmodSync(fragmentPath, 0o000);
    try {
      const result = runCLI(["build", "--watch", "--cwd", tmpDir, "--quiet"]);
      expect(result.status).toBe(3);
    } finally {
      chmodSync(fragmentPath, 0o644);
    }
  });
});

describe("security: generated output containment and collisions", () => {
  it("rejects a lexical output escape in build and check", () => {
    setupMinimalProject(tmpDir);
    const outsideName = `${basename(tmpDir)}-outside.md`;
    const outsidePath = join(tmpDir, "..", outsideName);

    writeFileSync(
      join(tmpDir, ".agentquilt", "config.yaml"),
      [
        "version: 1",
        "sourceDir: .agentquilt/agents",
        "targets:",
        `  - output: ../${outsideName}`,
        "    include: [_shared]",
      ].join("\n") + "\n",
      "utf8"
    );

    for (const command of ["build", "check"]) {
      const result = runCLI([command, "--cwd", tmpDir, "--quiet"]);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("escapes the repository");
    }
    expect(existsSync(outsidePath)).toBe(false);
    expect(existsSync(join(tmpDir, "agentquilt" + ".lock"))).toBe(false);
  });

  it("rejects a document output that would overwrite its source fragment", () => {
    setupMinimalProject(tmpDir);
    const sourcePath = join(tmpDir, ".agentquilt", "agents", "_shared", "010-tone.md");
    const original = readFileSync(sourcePath, "utf8");
    writeFileSync(
      join(tmpDir, ".agentquilt", "config.yaml"),
      [
        "version: 1",
        "sourceDir: .agentquilt/agents",
        "targets:",
        "  - output: .agentquilt/agents/_shared/010-tone.md",
        "    include: [_shared]",
      ].join("\n") + "\n",
      "utf8"
    );

    const result = runCLI(["build", "--cwd", tmpDir, "--quiet"]);
    expect(result.status).toBe(2);
    expect(readFileSync(sourcePath, "utf8")).toBe(original);
    expect(existsSync(join(tmpDir, "agentquilt" + ".lock"))).toBe(false);
  });

  it("rejects a document output inside the physical target of a symlinked source root", () => {
    const realSourceDir = join(tmpDir, "real-agents");
    const includeDir = join(realSourceDir, "project");
    const linkedSourceDir = join(tmpDir, "linked-agents");
    const sourcePath = join(includeDir, "010-role.md");
    mkdirSync(includeDir, { recursive: true });
    writeFileSync(sourcePath, "Canonical source.\n", "utf8");
    symlinkSync(realSourceDir, linkedSourceDir, "dir");
    mkdirSync(join(tmpDir, ".agentquilt"), { recursive: true });
    writeFileSync(
      join(tmpDir, ".agentquilt", "config.yaml"),
      [
        "version: 1",
        "sourceDir: linked-agents",
        "targets:",
        "  - output: real-agents/project/010-role.md",
        "    include: [project]",
      ].join("\n") + "\n",
      "utf8"
    );

    const result = runCLI(["build", "--cwd", tmpDir, "--quiet"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("must not be inside a source directory");
    expect(readFileSync(sourcePath, "utf8")).toBe("Canonical source.\n");
    expect(existsSync(join(tmpDir, "agentquilt" + ".lock"))).toBe(false);
  });

  it("rejects a document-vs-adapter collision before writing anything", () => {
    const sharedDir = join(tmpDir, ".agentquilt", "agents", "_shared");
    const agentDir = join(tmpDir, ".agentquilt", "agents", "helper");
    mkdirSync(sharedDir, { recursive: true });
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(sharedDir, "010-shared.md"), "Shared.\n", "utf8");
    writeFileSync(join(agentDir, "agent.yaml"), "description: Helper\n", "utf8");
    writeFileSync(join(agentDir, "010-role.md"), "Help.\n", "utf8");
    writeFileSync(
      join(tmpDir, ".agentquilt", "config.yaml"),
      [
        "version: 1",
        "sourceDir: .agentquilt/agents",
        "targets:",
        "  - output: .codex/agents/helper.toml",
        "    include: [_shared]",
        "  - kind: agent-definitions",
        "    agents: [helper]",
        "    platforms: [codex]",
      ].join("\n") + "\n",
      "utf8"
    );

    for (const command of ["build", "check"]) {
      const result = runCLI([command, "--cwd", tmpDir, "--quiet"]);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("output path collision");
    }
    expect(existsSync(join(tmpDir, ".codex", "agents", "helper.toml"))).toBe(false);
    expect(existsSync(join(tmpDir, "agentquilt" + ".lock"))).toBe(false);
  });

  it("rejects a symlinked output parent even with --force", () => {
    const outsideDir = mkdtempSync(join(tmpdir(), "aq-e2e-output-"));
    try {
      setupCodexAgentProject(tmpDir, "description: Helps out\nmodel: inherit\n");
      symlinkSync(outsideDir, join(tmpDir, ".codex"), "dir");

      for (const commandArgs of [["build"], ["build", "--force"], ["check"]]) {
        const result = runCLI([...commandArgs, "--cwd", tmpDir, "--quiet"]);
        expect(result.status).toBe(2);
        expect(result.stderr).toContain("through a symlink");
      }
      expect(existsSync(join(outsideDir, "agents", "helper.toml"))).toBe(false);
      expect(existsSync(join(tmpDir, "agentquilt" + ".lock"))).toBe(false);
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("rejects a dangling output-file symlink even with --force", () => {
    const outsideDir = mkdtempSync(join(tmpdir(), "aq-e2e-dangling-output-"));
    try {
      setupCodexAgentProject(tmpDir, "description: Helps out\nmodel: inherit\n");
      const outputDir = join(tmpDir, ".codex", "agents");
      mkdirSync(outputDir, { recursive: true });
      const outsideTarget = join(outsideDir, "not-created.toml");
      symlinkSync(outsideTarget, join(outputDir, "helper.toml"), "file");

      for (const commandArgs of [["build"], ["build", "--force"], ["check"]]) {
        const result = runCLI([...commandArgs, "--cwd", tmpDir, "--quiet"]);
        expect(result.status).toBe(2);
        expect(result.stderr).toContain("through a symlink");
      }
      expect(existsSync(outsideTarget)).toBe(false);
      expect(existsSync(join(tmpDir, "agentquilt" + ".lock"))).toBe(false);
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("rejects an output symlink to a canonical file inside the repository", () => {
    setupCodexAgentProject(tmpDir, "description: Helps out\nmodel: inherit\n");
    const configPath = join(tmpDir, ".agentquilt", "config.yaml");
    const original = readFileSync(configPath, "utf8");
    const outputDir = join(tmpDir, ".codex", "agents");
    mkdirSync(outputDir, { recursive: true });
    symlinkSync(configPath, join(outputDir, "helper.toml"), "file");

    for (const commandArgs of [["build", "--force"], ["check"]]) {
      const result = runCLI([...commandArgs, "--cwd", tmpDir, "--quiet"]);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("through a symlink");
    }
    expect(readFileSync(configPath, "utf8")).toBe(original);
  });
});

describe("security: path traversal via init adoption frontmatter name", () => {
  it("refuses to write outside .agentquilt/agents when frontmatter name traverses", () => {
    const claudeDir = join(tmpDir, ".claude", "agents");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      join(claudeDir, "evil.md"),
      '---\nname: "../../evil-escape"\ndescription: Bad agent\n---\n\nPayload.\n',
      "utf8"
    );

    // init should proceed (or at worst exit non-zero) but must never write outside agentsDir
    runCLI(["init", "--dir", tmpDir, "--platform", "claude"]);

    expect(existsSync(join(tmpDir, "evil-escape"))).toBe(false);
    expect(existsSync(join(tmpDir, ".agentquilt", "evil-escape"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Scenario 6 (also a security regression): init refuses to clobber existing config
// ---------------------------------------------------------------------------

describe("init: refuses to overwrite existing project", () => {
  it("exits 2 and leaves existing .agentquilt/config.yaml unmodified", () => {
    const aqDir = join(tmpDir, ".agentquilt");
    mkdirSync(aqDir, { recursive: true });
    const original = "version: 1\nsourceDir: custom/agents\n";
    writeFileSync(join(aqDir, "config.yaml"), original, "utf8");

    const result = runCLI(["init", "--dir", tmpDir, "--platform", "claude"]);

    expect(result.status).toBe(2);
    expect(readFileSync(join(aqDir, "config.yaml"), "utf8")).toBe(original);
  });
});
