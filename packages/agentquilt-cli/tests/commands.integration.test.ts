import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { initProject, generateConfig } from "../src/commands/init";
import { addAgentAction } from "../src/commands/agents/add";
import { addSkillAction } from "../src/commands/skills/add";
import { discoverAgentDirs, loadAgentDir } from "../src/core/agentLoader";
import { resolveModel } from "../src/core/modelResolver";
import type { AgentQuiltConfig } from "../src/schemas/config.schema";

let tmpDir: string;

// Prevent process.exit from killing the test process
const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `aq-cmd-integ-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  mockExit.mockClear();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// agentquilt init
// ---------------------------------------------------------------------------

describe("agentquilt init", () => {
  it("creates .agentquilt/config.yaml in the target directory", () => {
    initProject(tmpDir, ["claude"]);

    expect(existsSync(path.join(tmpDir, ".agentquilt", "config.yaml"))).toBe(true);
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("creates .gitattributes in the target directory", () => {
    initProject(tmpDir, ["claude"]);

    expect(existsSync(path.join(tmpDir, ".gitattributes"))).toBe(true);
  });

  it("creates the .agentquilt/agents/ directory", () => {
    initProject(tmpDir, ["claude"]);

    expect(existsSync(path.join(tmpDir, ".agentquilt", "agents"))).toBe(true);
  });

  it("--platform claude generates an agent-definitions target with claude platform", () => {
    initProject(tmpDir, ["claude"]);

    const configContent = readFileSync(
      path.join(tmpDir, ".agentquilt", "config.yaml"),
      "utf8"
    );
    expect(configContent).toContain("kind: agent-definitions");
    expect(configContent).toContain("claude");
  });

  it("exits with code 2 when given an invalid platform", () => {
    initProject(tmpDir, ["not-a-platform"]);

    expect(mockExit).toHaveBeenCalledWith(2);
  });

  it("creates the .agentquilt/skills/ directory when agentskills selected", () => {
    initProject(tmpDir, ["agentskills"]);

    expect(existsSync(path.join(tmpDir, ".agentquilt", "skills"))).toBe(true);
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("does not create .agentquilt/skills/ for claude-only projects", () => {
    initProject(tmpDir, ["claude"]);

    expect(existsSync(path.join(tmpDir, ".agentquilt", "skills"))).toBe(false);
  });
});

describe("generateConfig", () => {
  it("includes version and sourceDir", () => {
    const config = generateConfig(["claude"]);
    expect(config).toContain("version: 1");
    expect(config).toContain("sourceDir: .agentquilt/agents");
  });

  it("includes agent-definitions target with claude platform", () => {
    const config = generateConfig(["claude"]);
    expect(config).toContain("kind: agent-definitions");
    expect(config).toContain("claude");
  });

  it("generates a dedicated skills target when agentskills selected", () => {
    const config = generateConfig(["agentskills"]);
    expect(config).toContain("sourceDir: skills");
    expect(config).toContain("platforms: [agentskills]");
  });

  it("keeps agents and skills targets separate when both platforms selected", () => {
    const config = generateConfig(["claude", "agentskills"]);
    expect(config).toContain("platforms: [claude]");
    expect(config).toContain("platforms: [agentskills]");
    expect(config).not.toContain("platforms: [claude, agentskills]");
  });

  it("leaves defaultModelTier commented out so agents inherit the platform model", () => {
    const config = generateConfig(["claude"]);
    expect(config).toContain("# defaultModelTier: balanced");
    expect(config).not.toMatch(/^defaultModelTier:/m);
  });

  it("scaffolds preset targets with an empty include and a hint comment", () => {
    const config = generateConfig(["claude", "gemini"]);
    expect(config).toContain("preset: gemini");
    expect(config).toContain("include: []");
  });

  it("scaffolds preset targets with adopted agent names in include", () => {
    const config = generateConfig(["gemini"], ["helper", "reviewer"]);
    expect(config).toContain("include: [helper, reviewer]");
  });
});

// ---------------------------------------------------------------------------
// agentquilt agents add
// ---------------------------------------------------------------------------

describe("agentquilt agents add", () => {
  it("creates <sourceDir>/<name>/agent.yaml at the default source location", () => {
    addAgentAction("my-bot", { cwd: tmpDir });

    expect(
      existsSync(path.join(tmpDir, ".agentquilt", "agents", "my-bot", "agent.yaml"))
    ).toBe(true);
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("creates <sourceDir>/<name>/010-role.md at the default source location", () => {
    addAgentAction("my-bot", { cwd: tmpDir });

    expect(
      existsSync(path.join(tmpDir, ".agentquilt", "agents", "my-bot", "010-role.md"))
    ).toBe(true);
  });

  it("respects a configured sourceDir over the default", () => {
    writeFileSync(
      path.join(tmpDir, "agentquilt.config.yaml"),
      [
        "version: 1",
        "sourceDir: custom-agents",
        "targets:",
        "  - output: AGENTS.md",
        "    include: [_shared]",
      ].join("\n"),
      "utf8"
    );
    mkdirSync(path.join(tmpDir, "custom-agents", "_shared"), { recursive: true });

    addAgentAction("my-bot", { cwd: tmpDir });

    expect(
      existsSync(path.join(tmpDir, "custom-agents", "my-bot", "agent.yaml"))
    ).toBe(true);
  });

  it("agent.yaml contains description but no active model field (inherit by default)", () => {
    addAgentAction("scaffolded-agent", { cwd: tmpDir });

    const content = readFileSync(
      path.join(tmpDir, ".agentquilt", "agents", "scaffolded-agent", "agent.yaml"),
      "utf8"
    );
    expect(content).toContain("description:");
    expect(content).toContain("permissions:");
    // model is only a commented hint — omitting it means "inherit platform model"
    expect(content).toContain("# model: balanced");
    expect(content).not.toMatch(/^model:/m);
  });

  it("exits with code 2 when the agent already exists", () => {
    // Create the agent once
    addAgentAction("dupe-agent", { cwd: tmpDir });
    mockExit.mockClear();

    // Try to create it again
    addAgentAction("dupe-agent", { cwd: tmpDir });

    expect(mockExit).toHaveBeenCalledWith(2);
  });


});

// ---------------------------------------------------------------------------
// agentquilt skills add
// ---------------------------------------------------------------------------

describe("agentquilt skills add", () => {
  it("creates agent.yaml and 010-instructions.md at the default skills location", () => {
    addSkillAction("my-skill", { cwd: tmpDir });

    expect(
      existsSync(path.join(tmpDir, ".agentquilt", "skills", "my-skill", "agent.yaml"))
    ).toBe(true);
    expect(
      existsSync(path.join(tmpDir, ".agentquilt", "skills", "my-skill", "010-instructions.md"))
    ).toBe(true);
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("manifest sets model: inherit and no permissions", () => {
    addSkillAction("inherit-skill", { cwd: tmpDir });

    const content = readFileSync(
      path.join(tmpDir, ".agentquilt", "skills", "inherit-skill", "agent.yaml"),
      "utf8"
    );
    expect(content).toContain("description:");
    expect(content).toMatch(/^model: inherit/m);
    expect(content).not.toContain("permissions:");
  });

  it("resolves the skills dir as a sibling of a configured sourceDir", () => {
    writeFileSync(
      path.join(tmpDir, "agentquilt.config.yaml"),
      [
        "version: 1",
        "sourceDir: custom/agents",
        "targets:",
        "  - output: AGENTS.md",
        "    include: [_shared]",
      ].join("\n"),
      "utf8"
    );
    mkdirSync(path.join(tmpDir, "custom", "agents", "_shared"), { recursive: true });

    addSkillAction("my-skill", { cwd: tmpDir });

    expect(
      existsSync(path.join(tmpDir, "custom", "skills", "my-skill", "agent.yaml"))
    ).toBe(true);
  });

  it("exits with code 2 when the skill already exists", () => {
    addSkillAction("dupe-skill", { cwd: tmpDir });
    mockExit.mockClear();

    addSkillAction("dupe-skill", { cwd: tmpDir });

    expect(mockExit).toHaveBeenCalledWith(2);
  });
});

// ---------------------------------------------------------------------------
// agentquilt agents list (via underlying library functions)
// ---------------------------------------------------------------------------

describe("agentquilt agents list (library functions)", () => {
  beforeEach(() => {
    // Set up a minimal project
    mkdirSync(path.join(tmpDir, "agents", "agent-a"), { recursive: true });
    mkdirSync(path.join(tmpDir, "agents", "agent-b"), { recursive: true });
    writeFileSync(
      path.join(tmpDir, "agents", "agent-a", "agent.yaml"),
      'description: "Agent A"\nmodel: balanced\n',
      "utf8"
    );
    writeFileSync(
      path.join(tmpDir, "agents", "agent-b", "agent.yaml"),
      'description: "Agent B"\nmodel: balanced\n',
      "utf8"
    );
    writeFileSync(
      path.join(tmpDir, "agents", "agent-a", "010-role.md"),
      "You are agent A.\n",
      "utf8"
    );
    writeFileSync(
      path.join(tmpDir, "agents", "agent-b", "010-role.md"),
      "You are agent B.\n",
      "utf8"
    );
  });

  it("discovers all agents in the source directory", () => {
    const sourceDir = path.join(tmpDir, "agents");
    const dirs = discoverAgentDirs(sourceDir);

    expect(dirs.map((d) => path.basename(d))).toContain("agent-a");
    expect(dirs.map((d) => path.basename(d))).toContain("agent-b");
  });

  it("loads each agent and resolves the model", () => {
    const sourceDir = path.join(tmpDir, "agents");
    const dirs = discoverAgentDirs(sourceDir);
    const config: AgentQuiltConfig = {
      version: 1,
      sourceDir: "agents",
      modelTiers: {
        balanced: { claude: "claude-sonnet-4-6" },
      },
      targets: [],
    } as unknown as AgentQuiltConfig;

    for (const dir of dirs) {
      const record = loadAgentDir(dir, tmpDir);
      const resolved = resolveModel(record.definition, "claude", config);
      expect(resolved.model).toBe("claude-sonnet-4-6");
    }
  });

  it("returns an empty array when source directory has no agents", () => {
    const emptyDir = path.join(tmpDir, "empty-agents");
    mkdirSync(emptyDir, { recursive: true });
    const dirs = discoverAgentDirs(emptyDir);
    expect(dirs).toHaveLength(0);
  });
});
