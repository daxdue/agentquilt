import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";
import os from "os";

// Importing the claude adapter registers it in the global adapter registry
import "../src/core/adapters/claude";

import { compileAgentDefinitionsTarget } from "../src/core/agentCompiler";
import type { AgentDefinitionsTarget } from "../src/core/agentCompiler";
import type { AgentQuiltConfig } from "../src/schemas/config.schema";

let tmpDir: string;

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `aq-agent-compiler-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeConfig(): AgentQuiltConfig {
  return {
    version: 1,
    sourceDir: "agents",
    modelTiers: {
      balanced: { claude: "claude-sonnet-4-6" },
    },
    targets: [],
  } as unknown as AgentQuiltConfig;
}

function scaffoldAgent(
  baseDir: string,
  name: string,
  opts?: { yaml?: string; fragments?: Record<string, string> }
): void {
  const agentDir = path.join(baseDir, name);
  mkdirSync(agentDir, { recursive: true });
  const yaml = opts?.yaml ?? `description: "${name} test agent"\nmodel: balanced\n`;
  writeFileSync(path.join(agentDir, "agent.yaml"), yaml, "utf8");
  const fragments = opts?.fragments ?? { "010-role.md": `You are the ${name} agent.\n` };
  for (const [fname, content] of Object.entries(fragments)) {
    writeFileSync(path.join(agentDir, fname), content, "utf8");
  }
}

function makeTarget(agents: string[] | "*", platforms = ["claude"]): AgentDefinitionsTarget {
  return { kind: "agent-definitions", agents, platforms };
}

describe("compileAgentDefinitionsTarget", () => {
  it("compiles a single agent and returns a lock record and adapter output", async () => {
    scaffoldAgent(tmpDir, "my-agent");

    const result = await compileAgentDefinitionsTarget(
      makeTarget(["my-agent"]),
      makeConfig(),
      tmpDir,
      tmpDir
    );

    expect(result.agentRecords).toHaveLength(1);
    expect(result.agentRecords[0].name).toBe("my-agent");
    expect(result.agentRecords[0].version).toMatch(/^sha256-/);

    const outputs = result.outputs.get("my-agent");
    expect(outputs).toBeDefined();
    expect(outputs!.length).toBeGreaterThan(0);
  });

  it("claude adapter output starts with --- (not an HTML comment) for agent discovery", async () => {
    scaffoldAgent(tmpDir, "clean-agent");

    const result = await compileAgentDefinitionsTarget(
      makeTarget(["clean-agent"]),
      makeConfig(),
      tmpDir,
      tmpDir
    );

    const claudeOut = result.outputs.get("clean-agent")!.find((o) =>
      o.path.includes(".claude/agents/")
    )!;

    expect(claudeOut.content).toMatch(/^---/);
    expect(claudeOut.content).not.toContain("<!-- agentquilt:");
  });

  it("claude adapter output includes agent name, description, and body text", async () => {
    scaffoldAgent(tmpDir, "rich-agent", {
      yaml: 'description: "Does rich things"\nmodel: balanced\n',
      fragments: { "010-role.md": "You handle rich tasks.\n" },
    });

    const result = await compileAgentDefinitionsTarget(
      makeTarget(["rich-agent"]),
      makeConfig(),
      tmpDir,
      tmpDir
    );

    const content = result.outputs.get("rich-agent")![0].content;
    expect(content).toContain("name: rich-agent");
    expect(content).toContain("Does rich things");
    expect(content).toContain("You handle rich tasks.");
  });

  it("compiles an agent with no body fragments without crashing", async () => {
    const agentDir = path.join(tmpDir, "empty-agent");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, "agent.yaml"), 'description: "Empty agent"\n', "utf8");

    const result = await compileAgentDefinitionsTarget(
      makeTarget(["empty-agent"]),
      makeConfig(),
      tmpDir,
      tmpDir
    );

    expect(result.agentRecords).toHaveLength(1);
    expect(result.agentRecords[0].name).toBe("empty-agent");
  });

  it("throws when agent.yaml is missing from the agent directory", async () => {
    const agentDir = path.join(tmpDir, "no-yaml-agent");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, "010-role.md"), "Some role.\n", "utf8");

    await expect(
      compileAgentDefinitionsTarget(makeTarget(["no-yaml-agent"]), makeConfig(), tmpDir, tmpDir)
    ).rejects.toThrow();
  });

  it("throws when agent.yaml is missing the required description field", async () => {
    const agentDir = path.join(tmpDir, "bad-yaml-agent");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, "agent.yaml"), "model: balanced\n", "utf8"); // no description

    await expect(
      compileAgentDefinitionsTarget(makeTarget(["bad-yaml-agent"]), makeConfig(), tmpDir, tmpDir)
    ).rejects.toThrow();
  });

  it("compiles multiple agents in a single target", async () => {
    scaffoldAgent(tmpDir, "agent-alpha");
    scaffoldAgent(tmpDir, "agent-beta");

    const result = await compileAgentDefinitionsTarget(
      makeTarget(["agent-alpha", "agent-beta"]),
      makeConfig(),
      tmpDir,
      tmpDir
    );

    expect(result.agentRecords).toHaveLength(2);
    expect(result.outputs.has("agent-alpha")).toBe(true);
    expect(result.outputs.has("agent-beta")).toBe(true);
    expect(result.agentRecords.map((r) => r.name).sort()).toEqual(["agent-alpha", "agent-beta"]);
  });

  it("AdapterOutput has the correct path and kind for claude platform", async () => {
    scaffoldAgent(tmpDir, "path-test");

    const result = await compileAgentDefinitionsTarget(
      makeTarget(["path-test"]),
      makeConfig(),
      tmpDir,
      tmpDir
    );

    const out = result.outputs.get("path-test")![0];
    expect(out.path).toBe(".claude/agents/path-test.md");
    expect(out.kind).toBe("file");
    expect(typeof out.content).toBe("string");
    expect(out.content.length).toBeGreaterThan(0);
  });

  it("wildcards (*) discover all agents in sourceDir", async () => {
    scaffoldAgent(tmpDir, "auto-one");
    scaffoldAgent(tmpDir, "auto-two");

    const result = await compileAgentDefinitionsTarget(
      makeTarget("*"),
      makeConfig(),
      tmpDir,
      tmpDir
    );

    expect(result.agentRecords.length).toBeGreaterThanOrEqual(2);
    const names = result.agentRecords.map((r) => r.name);
    expect(names).toContain("auto-one");
    expect(names).toContain("auto-two");
  });

  it("fragmentMap contains an entry for each body fragment", async () => {
    scaffoldAgent(tmpDir, "frag-agent", {
      yaml: 'description: "Fragment agent"\n',
      fragments: {
        "010-role.md": "Role content.\n",
        "020-rules.md": "Rules content.\n",
      },
    });

    const result = await compileAgentDefinitionsTarget(
      makeTarget(["frag-agent"]),
      makeConfig(),
      tmpDir,
      tmpDir
    );

    expect(result.fragmentMap.size).toBe(2);
    for (const [, meta] of result.fragmentMap) {
      expect(meta.hash).toMatch(/^sha256-/);
      expect(meta.bytes).toBeGreaterThan(0);
    }
  });
});
