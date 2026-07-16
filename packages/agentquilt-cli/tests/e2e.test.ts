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
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";

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
