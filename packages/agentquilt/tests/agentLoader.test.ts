import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { tmpdir } from "os";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";
import { loadAgentDir, discoverAgentDirs, resolveAgents } from "../src/core/agentLoader";

describe("agentLoader", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = path.join(tmpdir(), `agentquilt-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should load a valid agent directory", () => {
    const agentDir = path.join(tempDir, "test-agent");
    mkdirSync(agentDir, { recursive: true });

    writeFileSync(
      path.join(agentDir, "agent.yaml"),
      'description: "Test agent"\nmodel: balanced\n',
      "utf8"
    );
    writeFileSync(path.join(agentDir, "010-role.md"), "You are helpful.\n", "utf8");

    const record = loadAgentDir(agentDir, tempDir);
    expect(record.name).toBe("test-agent");
    expect(record.definition.description).toBe("Test agent");
    expect(record.bodyFragments).toHaveLength(1);
  });

  it("should use custom name from agent.yaml", () => {
    const agentDir = path.join(tempDir, "agent-with-name");
    mkdirSync(agentDir, { recursive: true });

    writeFileSync(
      path.join(agentDir, "agent.yaml"),
      'name: "CustomName"\ndescription: "Test"\n',
      "utf8"
    );
    writeFileSync(path.join(agentDir, "010-role.md"), "You are helpful.\n", "utf8");

    const record = loadAgentDir(agentDir, tempDir);
    expect(record.name).toBe("CustomName");
  });

  it("should discover agents with agent.yaml", () => {
    const sourceDir = path.join(tempDir, "agents");
    mkdirSync(sourceDir, { recursive: true });

    const agent1 = path.join(sourceDir, "agent1");
    mkdirSync(agent1, { recursive: true });
    writeFileSync(
      path.join(agent1, "agent.yaml"),
      'description: "Agent 1"\n',
      "utf8"
    );

    const agent2 = path.join(sourceDir, "agent2");
    mkdirSync(agent2, { recursive: true });
    writeFileSync(
      path.join(agent2, "agent.yaml"),
      'description: "Agent 2"\n',
      "utf8"
    );

    const dirs = discoverAgentDirs(sourceDir);
    expect(dirs).toHaveLength(2);
  });

  it("should resolve agents with wildcard", () => {
    const sourceDir = path.join(tempDir, "wildcard-agents");
    mkdirSync(sourceDir, { recursive: true });

    const agent1 = path.join(sourceDir, "alpha");
    mkdirSync(agent1, { recursive: true });
    writeFileSync(
      path.join(agent1, "agent.yaml"),
      'description: "Alpha"\n',
      "utf8"
    );
    writeFileSync(path.join(agent1, "010-role.md"), "Alpha role.\n", "utf8");

    const records = resolveAgents("*", sourceDir, tempDir);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("alpha");
  });

  it("should resolve agents with explicit list", () => {
    const sourceDir = path.join(tempDir, "explicit-agents");
    mkdirSync(sourceDir, { recursive: true });

    const agent1 = path.join(sourceDir, "agent1");
    mkdirSync(agent1, { recursive: true });
    writeFileSync(
      path.join(agent1, "agent.yaml"),
      'description: "Agent 1"\n',
      "utf8"
    );
    writeFileSync(path.join(agent1, "010-role.md"), "Agent 1 role.\n", "utf8");

    const records = resolveAgents(["agent1"], sourceDir, tempDir);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("agent1");
  });

  it("should sort agents by name byte order", () => {
    const sourceDir = path.join(tempDir, "sort-agents");
    mkdirSync(sourceDir, { recursive: true });

    for (const name of ["zebra", "alpha", "beta"]) {
      const dir = path.join(sourceDir, name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, "agent.yaml"),
        `description: "${name}"\n`,
        "utf8"
      );
      writeFileSync(path.join(dir, "010-role.md"), `${name} role.\n`, "utf8");
    }

    const records = resolveAgents("*", sourceDir, tempDir);
    expect(records.map((r) => r.name)).toEqual(["alpha", "beta", "zebra"]);
  });
});
