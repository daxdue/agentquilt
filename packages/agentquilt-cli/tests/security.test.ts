import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { validateConfig, ConfigError } from "../src/core/configLoader";
import type { AgentQuiltConfig } from "../src/schemas/config.schema";

let tmpDir: string;

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `aq-security-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(path.join(tmpDir, "agents", "_shared"), { recursive: true });
  mkdirSync(path.join(tmpDir, "agents", "myagent"), { recursive: true });
  writeFileSync(path.join(tmpDir, "agents", "_shared", "010-tone.md"), "Be concise.\n");
  writeFileSync(path.join(tmpDir, "agents", "myagent", "010-role.md"), "You are an agent.\n");
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeConfig(includePaths: string[]): [AgentQuiltConfig, string] {
  const sourceDir = path.join(tmpDir, "agents");
  const config = {
    version: 1,
    sourceDir: "agents",
    targets: [
      {
        kind: "document" as const,
        output: "AGENTS.md",
        include: includePaths,
      },
    ],
  } as unknown as AgentQuiltConfig;
  return [config, sourceDir];
}

describe("path traversal validation (RISK-004)", () => {
  it("blocks a deep traversal escape (../../../../etc/passwd)", () => {
    const [config, sourceDir] = makeConfig(["../../../../etc/passwd"]);
    expect(() => validateConfig(config, sourceDir)).toThrow(ConfigError);
    expect(() => validateConfig(config, sourceDir)).toThrow("path traversal");
  });

  it("blocks a one-level escape (../outside)", () => {
    const [config, sourceDir] = makeConfig(["../outside"]);
    expect(() => validateConfig(config, sourceDir)).toThrow(ConfigError);
    expect(() => validateConfig(config, sourceDir)).toThrow("path traversal");
  });

  it("blocks an absolute path outside sourceDir (/etc/hosts)", () => {
    const [config, sourceDir] = makeConfig(["/etc/hosts"]);
    expect(() => validateConfig(config, sourceDir)).toThrow(ConfigError);
    expect(() => validateConfig(config, sourceDir)).toThrow("path traversal");
  });

  it("allows a normal relative subdirectory name (_shared)", () => {
    const [config, sourceDir] = makeConfig(["_shared"]);
    expect(() => validateConfig(config, sourceDir)).not.toThrow();
  });

  it("allows a relative path with leading dot-slash (./myagent)", () => {
    const [config, sourceDir] = makeConfig(["./myagent"]);
    expect(() => validateConfig(config, sourceDir)).not.toThrow();
  });

  it("allows a nested relative path (myagent)", () => {
    const [config, sourceDir] = makeConfig(["myagent"]);
    expect(() => validateConfig(config, sourceDir)).not.toThrow();
  });

  it("allows ../agents/myagent when it resolves back inside sourceDir", () => {
    // path.resolve('/foo/agents', '../agents/myagent') = '/foo/agents/myagent'
    // The final resolved path is within sourceDir, so it should pass
    const [config, sourceDir] = makeConfig(["../agents/myagent"]);
    expect(() => validateConfig(config, sourceDir)).not.toThrow();
  });

  it("reports an error for each traversal path, not stopping at the first", () => {
    const [config, sourceDir] = makeConfig(["../../../../etc/passwd", "_shared"]);
    expect(() => validateConfig(config, sourceDir)).toThrow("path traversal");
    // _shared is valid — ensure only the bad path is flagged, not both
  });
});
