import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";
import os from "os";

// Importing the adapters registers them in the global adapter registry
import "../src/core/adapters/claude";
import "../src/core/adapters/agentskills";

import {
  compileAgentDefinitionsTarget,
  mergeCompiledAgentTargets,
  type CompiledAgentTarget,
} from "../src/core/agentCompiler";
import { registerAdapter, type Adapter } from "../src/core/adapters";
import { fragmentHash } from "../src/core/normalize";
import { computeAgentVersion, type OutputEntry } from "../src/core/agentHasher";
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

  it("agentskills SKILL.md starts with --- (not an HTML comment) so frontmatter parses", async () => {
    scaffoldAgent(tmpDir, "clean-skill", {
      yaml: 'description: "A clean skill"\nmodel: inherit\n',
    });

    const result = await compileAgentDefinitionsTarget(
      makeTarget(["clean-skill"], ["agentskills"]),
      makeConfig(),
      tmpDir,
      tmpDir
    );

    const skillOut = result.outputs.get("clean-skill")!.find((o) =>
      o.path.includes(".agents/skills/")
    )!;

    expect(skillOut.content).toMatch(/^---\n/);
    expect(skillOut.content).not.toContain("<!-- agentquilt:");
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

  it("preserves exact adapter bytes, hashes them unchanged, and sorts paths", async () => {
    const rawContent = "raw output with two trailing newlines\n\n";
    const rawAdapter: Adapter = {
      id: "raw-exact-test",
      ADAPTER_VERSION: "1",
      outputsFor: () => [
        { path: "z-output.txt", content: "z\n" },
        { path: "a-output.txt", content: rawContent },
      ],
    };
    registerAdapter(rawAdapter);
    scaffoldAgent(tmpDir, "raw-agent", {
      yaml: 'description: "Raw agent"\nmodel: inherit\n',
    });

    const result = await compileAgentDefinitionsTarget(
      makeTarget(["raw-agent"], ["raw-exact-test"]),
      makeConfig(),
      tmpDir,
      tmpDir
    );

    const adapterOutputs = result.outputs.get("raw-agent")!;
    expect(adapterOutputs.map((output) => output.path)).toEqual([
      "a-output.txt",
      "z-output.txt",
    ]);
    expect(adapterOutputs[0].content).toBe(rawContent);
    expect(result.agentRecords[0].outputs.map((output) => output.path)).toEqual([
      "a-output.txt",
      "z-output.txt",
    ]);
    expect(result.agentRecords[0].outputs[0].hash).toBe(fragmentHash(rawContent));
  });

  it("rejects two adapters that emit the same output path for one agent", async () => {
    for (const id of ["collision-a-test", "collision-b-test"]) {
      registerAdapter({
        id,
        ADAPTER_VERSION: "1",
        outputsFor: () => [{ path: "same-output.txt", content: `${id}\n` }],
      });
    }
    scaffoldAgent(tmpDir, "collision-agent", {
      yaml: 'description: "Collision agent"\nmodel: inherit\n',
    });

    await expect(
      compileAgentDefinitionsTarget(
        makeTarget(["collision-agent"], ["collision-a-test", "collision-b-test"]),
        makeConfig(),
        tmpDir,
        tmpDir
      )
    ).rejects.toThrow("output path collision");
  });

  it("rejects portable case-equivalent paths across compiled agents", () => {
    const makeResult = (name: string, outputPath: string): CompiledAgentTarget => ({
      agentRecords: [
        {
          name,
          dir: `agents/${name}`,
          bodyFragments: [],
          metaHash: "meta",
          version: "version",
          outputs: [],
        },
      ],
      outputs: new Map([[name, [{ path: outputPath, content: "content", kind: "file" }]]]),
      fragmentMap: new Map(),
      bodyHashByName: new Map([[name, "body-hash"]]),
    });

    expect(() =>
      mergeCompiledAgentTargets([
        makeResult("upper", "provider/Foo.toml"),
        makeResult("lower", "provider/foo.toml"),
      ])
    ).toThrow("same portable path");
  });

  it("merges duplicate canonical agents across targets into one lock identity", () => {
    const result: CompiledAgentTarget = {
      agentRecords: [
        {
          name: "duplicate",
          dir: "agents/duplicate",
          bodyFragments: [],
          metaHash: "meta",
          version: "version",
          outputs: [],
        },
      ],
      outputs: new Map([["duplicate", []]]),
      fragmentMap: new Map(),
      bodyHashByName: new Map([["duplicate", "body-hash"]]),
    };

    const merged = mergeCompiledAgentTargets([result, result]);
    expect(merged.agentRecords).toHaveLength(1);
    expect(merged.agentRecords[0].name).toBe("duplicate");
  });

  it("binds agent versions to sorted output paths rather than adapter order", () => {
    const a: OutputEntry = {
      platform: "test",
      path: "a.txt",
      kind: "file",
      adapterVersion: "1",
      outputHash: "hash-a",
    };
    const z: OutputEntry = {
      platform: "test",
      path: "z.txt",
      kind: "file",
      adapterVersion: "1",
      outputHash: "hash-z",
    };

    const forward = computeAgentVersion("agent", "body", "meta", [a, z]);
    const reversed = computeAgentVersion("agent", "body", "meta", [z, a]);
    const swappedBytes = computeAgentVersion("agent", "body", "meta", [
      { ...a, outputHash: z.outputHash },
      { ...z, outputHash: a.outputHash },
    ]);

    expect(reversed).toBe(forward);
    expect(swappedBytes).not.toBe(forward);
  });
});
