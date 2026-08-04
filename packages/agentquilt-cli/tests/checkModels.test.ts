/**
 * End-to-end tests for `agentquilt agents check-models`, invoking the
 * compiled CLI binary as a subprocess (same style as e2e.test.ts) so the
 * command's CODEX_HOME resolution and process exit codes are exercised for
 * real, not mocked.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";

const CLI_BIN = fileURLToPath(new URL("../dist/index.js", import.meta.url));

function runCLI(
  args: string[],
  options: { cwd?: string; env?: Record<string, string> } = {}
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [CLI_BIN, ...args], {
    cwd: options.cwd,
    encoding: "utf8",
    timeout: 20_000,
    env: { ...process.env, ...options.env },
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/** Write a minimal project with one codex-tiered agent into `dir`. */
function setupProject(dir: string): void {
  const agentDir = join(dir, ".agentquilt", "agents", "helper");
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, "agent.yaml"), 'description: "Helper"\nmodel: balanced\n', "utf8");
  writeFileSync(join(agentDir, "010-role.md"), "You are a helper.\n", "utf8");
  writeFileSync(
    join(dir, ".agentquilt", "config.yaml"),
    [
      "version: 1",
      "sourceDir: .agentquilt/agents",
      "modelTiers:",
      "  balanced:",
      "    codex: gpt-5.6-terra",
      "    claude: claude-sonnet-4-6",
      "targets:",
      "  - kind: agent-definitions",
      "    agents: [helper]",
      "    platforms: [claude, codex]",
    ].join("\n") + "\n",
    "utf8"
  );
}

let tmpDir: string;
let codexHomeDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "aq-check-models-"));
  codexHomeDir = mkdtempSync(join(tmpdir(), "aq-codex-home-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  rmSync(codexHomeDir, { recursive: true, force: true });
});

describe("agents check-models", () => {
  it("reports OK and exits 0 when the model is present in the local cache", () => {
    setupProject(tmpDir);
    writeFileSync(
      join(codexHomeDir, "models_cache.json"),
      JSON.stringify({ models: [{ slug: "gpt-5.6-terra" }] }),
      "utf8"
    );

    const result = runCLI(["agents", "check-models", "--cwd", tmpDir], {
      env: { CODEX_HOME: codexHomeDir },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("OK");
    expect(result.stdout).toContain("gpt-5.6-terra");
  });

  it("reports WARN and exits 1 when the model is missing from the local cache", () => {
    setupProject(tmpDir);
    writeFileSync(
      join(codexHomeDir, "models_cache.json"),
      JSON.stringify({ models: [{ slug: "some-other-model" }] }),
      "utf8"
    );

    const result = runCLI(["agents", "check-models", "--cwd", tmpDir], {
      env: { CODEX_HOME: codexHomeDir },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("WARN");
    expect(result.stdout).toContain("gpt-5.6-terra");
  });

  it("reports SKIPPED and exits 0 when no cache file exists", () => {
    setupProject(tmpDir);
    // codexHomeDir intentionally left empty: no models_cache.json.

    const result = runCLI(["agents", "check-models", "--cwd", tmpDir], {
      env: { CODEX_HOME: codexHomeDir },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SKIPPED");
  });

  it("reports SKIPPED (not a crash) when the cache file is malformed JSON", () => {
    setupProject(tmpDir);
    writeFileSync(join(codexHomeDir, "models_cache.json"), "{ not valid json", "utf8");

    const result = runCLI(["agents", "check-models", "--cwd", tmpDir], {
      env: { CODEX_HOME: codexHomeDir },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SKIPPED");
  });

  it("reports SKIPPED for claude (no known cache source for that platform)", () => {
    setupProject(tmpDir);
    writeFileSync(
      join(codexHomeDir, "models_cache.json"),
      JSON.stringify({ models: [{ slug: "gpt-5.6-terra" }] }),
      "utf8"
    );

    const result = runCLI(["agents", "check-models", "--cwd", tmpDir], {
      env: { CODEX_HOME: codexHomeDir },
    });

    expect(result.stdout).toContain("claude-sonnet-4-6");
    // The claude row must be SKIPPED even though the run overall is clean.
    const claudeLine = result.stdout
      .split("\n")
      .find((line) => line.includes("claude-sonnet-4-6"));
    expect(claudeLine).toContain("SKIPPED");
  });

  it("never appears in any GitHub Actions workflow (advisory-only, no CI role)", () => {
    // This is a repo-level invariant, not just a unit assertion about this
    // test project — check the real .github/workflows directory.
    const workflowsDir = fileURLToPath(new URL("../../../.github/workflows", import.meta.url));
    for (const file of readdirSync(workflowsDir)) {
      const content = readFileSync(join(workflowsDir, file), "utf8");
      expect(content).not.toContain("check-models");
    }
  });
});
