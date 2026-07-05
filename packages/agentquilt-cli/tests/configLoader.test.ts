import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";
import os from "os";
import {
  loadConfig,
  validateConfig,
  resolvePreset,
  findConfigFile,
  ConfigError,
} from "../src/core/configLoader";

let tmpDir: string;

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `aq-cfg-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeConfig(name: string, content: string): string {
  const p = path.join(tmpDir, name);
  writeFileSync(p, content, "utf8");
  return p;
}

describe("resolvePreset", () => {
  it("returns default output for known presets", () => {
    expect(resolvePreset("claude")).toEqual({ output: "CLAUDE.md" });
    expect(resolvePreset("agents-md")).toEqual({ output: "AGENTS.md" });
    expect(resolvePreset("copilot")).toEqual({ output: ".github/copilot-instructions.md" });
  });

  it("returns empty object for unknown preset", () => {
    expect(resolvePreset("unknown-preset")).toEqual({});
  });

  it("returns empty object when called with no argument", () => {
    expect(resolvePreset()).toEqual({});
    expect(resolvePreset(undefined)).toEqual({});
  });
});

describe("findConfigFile", () => {
  it("finds .agentquilt/config.yaml when present", () => {
    mkdirSync(path.join(tmpDir, ".agentquilt"), { recursive: true });
    writeConfig(".agentquilt/config.yaml", "version: 1\ntargets: []");
    const found = findConfigFile(tmpDir);
    expect(found).toBe(path.join(tmpDir, ".agentquilt", "config.yaml"));
  });

  it("prefers .agentquilt/config.yaml over the legacy root config", () => {
    mkdirSync(path.join(tmpDir, ".agentquilt"), { recursive: true });
    writeConfig(".agentquilt/config.yaml", "version: 1\ntargets: []");
    writeConfig("agentquilt.config.yaml", "version: 1\ntargets: []");
    const found = findConfigFile(tmpDir);
    expect(found).toBe(path.join(tmpDir, ".agentquilt", "config.yaml"));
  });

  it("falls back to .agentquilt/config.json when yaml is absent", () => {
    mkdirSync(path.join(tmpDir, ".agentquilt"), { recursive: true });
    writeConfig(".agentquilt/config.json", '{"version":1,"targets":[]}');
    const found = findConfigFile(tmpDir);
    expect(found).toBe(path.join(tmpDir, ".agentquilt", "config.json"));
  });

  it("finds legacy agentquilt.config.yaml when present", () => {
    writeConfig("agentquilt.config.yaml", "version: 1\ntargets: []");
    const found = findConfigFile(tmpDir);
    expect(found).toBe(path.join(tmpDir, "agentquilt.config.yaml"));
  });

  it("falls back to legacy agentquilt.config.json when yaml is absent", () => {
    writeConfig("agentquilt.config.json", '{"version":1,"targets":[]}');
    const found = findConfigFile(tmpDir);
    expect(found).toBe(path.join(tmpDir, "agentquilt.config.json"));
  });

  it("throws ConfigError when no config file exists", () => {
    expect(() => findConfigFile(tmpDir)).toThrow(ConfigError);
  });
});

describe("loadConfig", () => {
  it("parses a minimal valid YAML config", () => {
    const agentDir = path.join(tmpDir, "agents", "shared");
    mkdirSync(agentDir, { recursive: true });
    const p = writeConfig("agentquilt.config.yaml", [
      "version: 1",
      "sourceDir: agents",
      "targets:",
      "  - output: AGENTS.md",
      "    include: [shared]",
    ].join("\n"));
    const config = loadConfig(p);
    expect(config.version).toBe(1);
    expect(config.targets).toHaveLength(1);
  });

  it("applies preset default output when output is omitted", () => {
    const p = writeConfig("agentquilt.config.yaml", [
      "version: 1",
      "targets:",
      "  - preset: claude",
      "    include: [myagent]",
    ].join("\n"));
    const config = loadConfig(p);
    expect(config.targets[0]).toMatchObject({ output: "CLAUDE.md" });
  });

  it("throws ConfigError when config file does not exist", () => {
    expect(() => loadConfig(path.join(tmpDir, "nonexistent.yaml"))).toThrow(ConfigError);
  });

  it("throws ConfigError on invalid YAML", () => {
    const p = writeConfig("agentquilt.config.yaml", "version: 1\ntargets: [\nnot valid yaml{{{");
    expect(() => loadConfig(p)).toThrow(ConfigError);
  });

  it("throws ConfigError on schema validation failure (missing targets)", () => {
    const p = writeConfig("agentquilt.config.yaml", "version: 1");
    expect(() => loadConfig(p)).toThrow(ConfigError);
  });

  it("uses default sourceDir of '.agentquilt/agents' when omitted", () => {
    const p = writeConfig("agentquilt.config.yaml", [
      "version: 1",
      "targets:",
      "  - output: AGENTS.md",
      "    include: [shared]",
    ].join("\n"));
    const config = loadConfig(p);
    expect(config.sourceDir).toBe(".agentquilt/agents");
  });
});

describe("validateConfig", () => {
  function makeMinimalConfig(sourceDir: string, include: string[] = ["myagent"]) {
    const agentDir = path.join(tmpDir, sourceDir, include[0]);
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, "010-role.md"), "Role.\n");
    const cfgPath = writeConfig("agentquilt.config.yaml", [
      "version: 1",
      `sourceDir: ${sourceDir}`,
      "targets:",
      `  - output: AGENTS.md`,
      `    include: [${include.join(", ")}]`,
    ].join("\n"));
    return { config: loadConfig(cfgPath), sourceDir: path.join(tmpDir, sourceDir) };
  }

  it("returns true for a valid config", () => {
    const { config, sourceDir } = makeMinimalConfig("agents");
    expect(validateConfig(config, sourceDir)).toBe(true);
  });

  it("throws ConfigError when an include directory does not exist", () => {
    const { config, sourceDir } = makeMinimalConfig("agents", ["myagent"]);
    // Remove the directory after building config
    rmSync(path.join(sourceDir, "myagent"), { recursive: true });
    expect(() => validateConfig(config, sourceDir)).toThrow(ConfigError);
  });

  it("throws ConfigError when two document targets share the same output path", () => {
    mkdirSync(path.join(tmpDir, "agents", "a"), { recursive: true });
    mkdirSync(path.join(tmpDir, "agents", "b"), { recursive: true });
    writeFileSync(path.join(tmpDir, "agents", "a", "010.md"), "A\n");
    writeFileSync(path.join(tmpDir, "agents", "b", "010.md"), "B\n");

    const cfgPath = writeConfig("agentquilt.config.yaml", [
      "version: 1",
      "sourceDir: agents",
      "targets:",
      "  - output: AGENTS.md",
      "    include: [a]",
      "  - output: AGENTS.md",
      "    include: [b]",
    ].join("\n"));
    const config = loadConfig(cfgPath);
    expect(() => validateConfig(config, path.join(tmpDir, "agents"))).toThrow(ConfigError);
  });
});
