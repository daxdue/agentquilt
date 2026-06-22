import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { tmpdir } from "os";
import { mkdirSync, readFileSync, existsSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { discoverAgentDirs, loadAgentDir } from "../src/core/agentLoader";
import { resolveModel } from "../src/core/modelResolver";
import { AgentQuiltConfig } from "../src/schemas/config.schema";

describe("agents commands unit tests", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = path.join(tmpdir(), `agentquilt-cmd-unit-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeFile(filepath: string, content: string): void {
    mkdirSync(path.dirname(filepath), { recursive: true });
    writeFileSync(filepath, content, "utf8");
  }

  it("should discover agents in source directory", () => {
    const sourceDir = path.join(tempDir, "discover-agents");
    mkdirSync(sourceDir, { recursive: true });

    const agent1 = path.join(sourceDir, "agent1");
    mkdirSync(agent1, { recursive: true });
    writeFile(
      path.join(agent1, "agent.yaml"),
      'description: "Agent 1"\n'
    );

    const agent2 = path.join(sourceDir, "agent2");
    mkdirSync(agent2, { recursive: true });
    writeFile(
      path.join(agent2, "agent.yaml"),
      'description: "Agent 2"\n'
    );

    const dirs = discoverAgentDirs(sourceDir);
    expect(dirs.map((d) => path.basename(d))).toContain("agent1");
    expect(dirs.map((d) => path.basename(d))).toContain("agent2");
  });

  it("should load agent definition and resolve model", () => {
    const agentDir = path.join(tempDir, "resolve-model-agent");
    mkdirSync(agentDir, { recursive: true });

    writeFile(
      path.join(agentDir, "agent.yaml"),
      'description: "Test agent"\nmodel: balanced\n'
    );
    writeFile(path.join(agentDir, "010-role.md"), "Test role.\n");

    const record = loadAgentDir(agentDir, tempDir);
    const config: AgentQuiltConfig = {
      version: 1,
      sourceDir: "agents",
      modelTiers: {
        balanced: { claude: "claude-3-5-sonnet-20241022" },
      },
      targets: [],
    };

    const resolved = resolveModel(record.definition, "claude", config);
    expect(resolved.model).toBe("claude-3-5-sonnet-20241022");
  });

  it("should handle agent with explicit permissions", () => {
    const agentDir = path.join(tempDir, "perms-agent");
    mkdirSync(agentDir, { recursive: true });

    writeFile(
      path.join(agentDir, "agent.yaml"),
      'description: "Test agent"\nmodel: balanced\npermissions: workspace\n'
    );
    writeFile(path.join(agentDir, "010-role.md"), "Test role.\n");

    const record = loadAgentDir(agentDir, tempDir);
    expect(record.definition.permissions).toBe("workspace");
  });

  it("should parse agent with x-* extensions", () => {
    const agentDir = path.join(tempDir, "ext-agent");
    mkdirSync(agentDir, { recursive: true });

    writeFile(
      path.join(agentDir, "agent.yaml"),
      'description: "Test agent"\nmodel: balanced\nx-custom-field: "custom value"\n'
    );
    writeFile(path.join(agentDir, "010-role.md"), "Test role.\n");

    const record = loadAgentDir(agentDir, tempDir);
    expect(record.definition["x-custom-field"]).toBe("custom value");
  });

  it("should validate required description field", () => {
    const agentDir = path.join(tempDir, "invalid-agent");
    mkdirSync(agentDir, { recursive: true });

    writeFile(
      path.join(agentDir, "agent.yaml"),
      'model: balanced\n'
    );

    expect(() => loadAgentDir(agentDir, tempDir)).toThrow();
  });
});
