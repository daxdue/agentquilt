/**
 * End-to-end tests for `agentquilt lint`, invoking the compiled CLI binary
 * as a subprocess (same style as e2e.test.ts / checkModels.test.ts).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";

const CLI_BIN = fileURLToPath(new URL("../dist/index.js", import.meta.url));

function runCLI(args: string[], options: { cwd?: string } = {}) {
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

function writeConfig(dir: string, extra = ""): void {
  writeFileSync(
    join(dir, ".agentquilt", "config.yaml"),
    [
      "version: 1",
      "sourceDir: .agentquilt/agents",
      "targets:",
      "  - kind: agent-definitions",
      "    agents: [helper]",
      "    platforms: [claude]",
      extra,
    ].join("\n") + "\n",
    "utf8"
  );
}

function writeAgent(
  dir: string,
  manifest = 'description: "Helper"\n',
  fragments: Record<string, string> = { "010-role.md": "You are a helper.\n" }
): void {
  const agentDir = join(dir, ".agentquilt", "agents", "helper");
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, "agent.yaml"), manifest, "utf8");
  for (const [fileName, content] of Object.entries(fragments)) {
    writeFileSync(join(agentDir, fileName), content, "utf8");
  }
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "aq-lint-"));
  mkdirSync(join(tmpDir, ".agentquilt"), { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("agentquilt lint", () => {
  it("passes cleanly on a well-formed agent, exit 0", () => {
    writeAgent(tmpDir);
    writeConfig(tmpDir);

    const result = runCLI(["lint", "--cwd", tmpDir]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Agent: .agentquilt/agents/helper");
    expect(result.stdout).toContain("passed");
  });

  it("reports an ERROR and exits 1 when agent.yaml fails schema validation", () => {
    writeAgent(tmpDir, "description: 123\n"); // description must be a string
    writeConfig(tmpDir);

    const result = runCLI(["lint", "--cwd", tmpDir]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("failed");
    expect(result.stdout).toContain("ERROR");
  });

  it("reports an ERROR and exits 1 when two fragments share an ordering prefix", () => {
    writeAgent(tmpDir, undefined, {
      "010-role.md": "Role one.\n",
      "010-alt-role.md": "Role two.\n",
    });
    writeConfig(tmpDir);

    const result = runCLI(["lint", "--cwd", tmpDir]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ERROR");
    expect(result.stdout).toContain("collides with");
    expect(result.stdout).toContain("010-role.md");
    expect(result.stdout).toContain("010-alt-role.md");
  });

  it("reports an ERROR and exits 1 when an agent is not wired to any target", () => {
    writeAgent(tmpDir);
    writeFileSync(
      join(tmpDir, ".agentquilt", "config.yaml"),
      ["version: 1", "sourceDir: .agentquilt/agents", "targets:", "  - kind: agent-definitions", "    agents: []", "    platforms: [claude]"].join(
        "\n"
      ) + "\n",
      "utf8"
    );

    const result = runCLI(["lint", "--cwd", tmpDir]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ERROR");
    expect(result.stdout).toContain("not included in any agent-definitions target");
  });

  it("reports a WARN (not ERROR) and exits 0 for malformed front-matter YAML", () => {
    writeAgent(tmpDir, undefined, {
      "010-role.md": "---\n[not: valid: yaml\n---\nBody.\n",
    });
    writeConfig(tmpDir);

    const result = runCLI(["lint", "--cwd", tmpDir]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("WARN");
    expect(result.stdout).toContain("not valid YAML");
    expect(result.stdout).not.toContain("ERROR");
  });

  it("reports a WARN (not ERROR) and exits 0 when tags is not an array of strings", () => {
    writeAgent(tmpDir, undefined, {
      "010-role.md": "---\ntags: not-an-array\n---\nBody.\n",
    });
    writeConfig(tmpDir);

    const result = runCLI(["lint", "--cwd", tmpDir]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("WARN");
    expect(result.stdout).toContain('"tags" should be an array of strings');
  });

  it("exits 0 with no agents found when the source directory is empty", () => {
    writeFileSync(
      join(tmpDir, ".agentquilt", "config.yaml"),
      ["version: 1", "sourceDir: .agentquilt/agents", "targets:", "  - kind: agent-definitions", "    agents: \"*\"", "    platforms: [claude]"].join(
        "\n"
      ) + "\n",
      "utf8"
    );
    mkdirSync(join(tmpDir, ".agentquilt", "agents"), { recursive: true });

    const result = runCLI(["lint", "--cwd", tmpDir]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No agents found");
  });

  it("exits 2 with a config error when no config file exists", () => {
    const result = runCLI(["lint", "--cwd", tmpDir]);
    expect(result.status).toBe(2);
  });
});
