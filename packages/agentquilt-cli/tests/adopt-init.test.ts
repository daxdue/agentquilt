import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  parseFrontmatter,
  reverseMapModel,
  reverseMapPermissions,
  adoptExistingAgents,
  initProject,
} from "../src/commands/init.js";

// --- parseFrontmatter ---

describe("parseFrontmatter", () => {
  it("extracts YAML frontmatter and body", () => {
    const content = "---\nname: foo\ndescription: bar\n---\n\nHello world.\n";
    const { fm, body } = parseFrontmatter(content);
    expect(fm["name"]).toBe("foo");
    expect(fm["description"]).toBe("bar");
    expect(body).toBe("Hello world.\n");
  });

  it("returns empty fm and full content when no frontmatter", () => {
    const content = "No frontmatter here.\n";
    const { fm, body } = parseFrontmatter(content);
    expect(fm).toEqual({});
    expect(body).toBe("No frontmatter here.\n");
  });

  it("handles CRLF line endings in frontmatter delimiter", () => {
    const content = "---\r\nname: foo\r\n---\r\nBody text.\n";
    const { fm, body } = parseFrontmatter(content);
    expect(fm["name"]).toBe("foo");
    expect(body).toContain("Body text.");
  });

  it("handles multiline values in frontmatter", () => {
    const content = "---\nname: my-agent\ndescription: A long description\n  that spans lines\n---\n\nBody.\n";
    const { fm } = parseFrontmatter(content);
    expect(fm["name"]).toBe("my-agent");
  });

  it("returns empty fm when YAML is malformed", () => {
    const content = "---\n: : :\n---\nBody.\n";
    const { fm, body } = parseFrontmatter(content);
    expect(fm).toEqual({});
    expect(body).toContain("---");
  });
});

// --- reverseMapModel ---

describe("reverseMapModel", () => {
  it("maps sonnet → balanced", () => expect(reverseMapModel("sonnet")).toBe("balanced"));
  it("maps opus → frontier", () => expect(reverseMapModel("opus")).toBe("frontier"));
  it("maps haiku → fast", () => expect(reverseMapModel("haiku")).toBe("fast"));
  it("returns undefined for unknown model", () => expect(reverseMapModel("gpt-4")).toBeUndefined());
  it("returns undefined for undefined input", () => expect(reverseMapModel(undefined)).toBeUndefined());
  it("returns undefined for null", () => expect(reverseMapModel(null)).toBeUndefined());
});

// --- reverseMapPermissions ---

describe("reverseMapPermissions", () => {
  it("maps acceptEdits permissionMode → full", () => {
    expect(reverseMapPermissions(undefined, "acceptEdits")).toBe("full");
  });

  it("maps non-empty tools string → read-only", () => {
    expect(reverseMapPermissions("Read, Grep, Glob", undefined)).toBe("read-only");
  });

  it("maps no tools and no permissionMode → workspace", () => {
    expect(reverseMapPermissions(undefined, undefined)).toBe("workspace");
  });

  it("acceptEdits takes priority over tools", () => {
    expect(reverseMapPermissions("Read, Grep, Glob", "acceptEdits")).toBe("full");
  });

  it("empty tools string → workspace", () => {
    expect(reverseMapPermissions("", undefined)).toBe("workspace");
  });
});

// --- adoptExistingAgents ---

describe("adoptExistingAgents", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "aq-adopt-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeClaudeAgent(name: string, content: string): void {
    const dir = join(tmpDir, ".claude", "agents");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${name}.md`), content, "utf8");
  }

  function agentsDir(): string {
    return join(tmpDir, ".agentquilt", "agents");
  }

  function skillsDir(): string {
    return join(tmpDir, ".agentquilt", "skills");
  }

  function initAgentsDir(): string {
    const dir = agentsDir();
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  function initSkillsDir(): string {
    const dir = skillsDir();
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  it("returns no adoptions when no .claude/agents/ directory exists", () => {
    const dir = initAgentsDir();
    expect(adoptExistingAgents(tmpDir, ["claude"], dir, skillsDir())).toEqual({
      agents: [],
      skills: [],
    });
  });

  it("adopts a claude agent with full frontmatter", () => {
    writeClaudeAgent(
      "my-agent",
      "---\nname: my-agent\ndescription: Does things\nmodel: sonnet\ntools: Read, Grep, Glob\n---\n\nYou are helpful.\n"
    );
    const dir = initAgentsDir();
    const adopted = adoptExistingAgents(tmpDir, ["claude"], dir, skillsDir());

    expect(adopted.agents).toHaveLength(1);

    const agentYaml = readFileSync(join(dir, "my-agent", "agent.yaml"), "utf8");
    expect(agentYaml).toContain('description: "Does things"');
    expect(agentYaml).toContain("model: balanced");
    expect(agentYaml).toContain("permissions: read-only");

    const roleBlock = readFileSync(join(dir, "my-agent", "010-role.md"), "utf8");
    expect(roleBlock).toContain("You are helpful.");
  });

  it("omits model field when model shortname is unrecognized", () => {
    writeClaudeAgent(
      "no-model",
      "---\nname: no-model\ndescription: No model\n---\n\nBody.\n"
    );
    const dir = initAgentsDir();
    adoptExistingAgents(tmpDir, ["claude"], dir, skillsDir());

    const agentYaml = readFileSync(join(dir, "no-model", "agent.yaml"), "utf8");
    expect(agentYaml).not.toContain("model:");
    expect(agentYaml).toContain("permissions: workspace");
  });

  it("maps opus → frontier", () => {
    writeClaudeAgent(
      "big-agent",
      "---\nname: big-agent\ndescription: Big\nmodel: opus\npermissionMode: acceptEdits\n---\n\nBody.\n"
    );
    const dir = initAgentsDir();
    adoptExistingAgents(tmpDir, ["claude"], dir, skillsDir());

    const yaml = readFileSync(join(dir, "big-agent", "agent.yaml"), "utf8");
    expect(yaml).toContain("model: frontier");
    expect(yaml).toContain("permissions: full");
  });

  it("skips agent whose source dir already exists (idempotent)", () => {
    writeClaudeAgent(
      "existing",
      "---\nname: existing\ndescription: Existing\nmodel: sonnet\ntools: Read, Grep, Glob\n---\n\nOld body.\n"
    );
    const dir = initAgentsDir();
    // Pre-create the source dir
    mkdirSync(join(dir, "existing"), { recursive: true });
    writeFileSync(join(dir, "existing", "agent.yaml"), "description: hand-authored\n", "utf8");

    const adopted = adoptExistingAgents(tmpDir, ["claude"], dir, skillsDir());
    expect(adopted.agents).toEqual([]);

    // Original hand-authored file must not be overwritten
    const content = readFileSync(join(dir, "existing", "agent.yaml"), "utf8");
    expect(content).toContain("hand-authored");
  });

  it("falls back to filename stem when name is absent from frontmatter", () => {
    writeClaudeAgent(
      "no-name-in-fm",
      "---\ndescription: No name in FM\nmodel: haiku\n---\n\nBody.\n"
    );
    const dir = initAgentsDir();
    adoptExistingAgents(tmpDir, ["claude"], dir, skillsDir());

    expect(existsSync(join(dir, "no-name-in-fm", "agent.yaml"))).toBe(true);
    const yaml = readFileSync(join(dir, "no-name-in-fm", "agent.yaml"), "utf8");
    expect(yaml).toContain("model: fast");
  });

  it("uses placeholder description when description is absent", () => {
    writeClaudeAgent(
      "no-desc",
      "---\nname: no-desc\nmodel: sonnet\n---\n\nBody.\n"
    );
    const dir = initAgentsDir();
    adoptExistingAgents(tmpDir, ["claude"], dir, skillsDir());

    const yaml = readFileSync(join(dir, "no-desc", "agent.yaml"), "utf8");
    expect(yaml).toContain("Adopted from .claude/agents/no-desc.md");
  });

  it("adopts multiple agents and returns their names", () => {
    writeClaudeAgent("alpha", "---\nname: alpha\ndescription: Alpha\nmodel: sonnet\n---\n\nAlpha.\n");
    writeClaudeAgent("beta", "---\nname: beta\ndescription: Beta\nmodel: opus\n---\n\nBeta.\n");
    const dir = initAgentsDir();
    const adopted = adoptExistingAgents(tmpDir, ["claude"], dir, skillsDir());

    expect(adopted.agents).toHaveLength(2);
    expect(existsSync(join(dir, "alpha", "agent.yaml"))).toBe(true);
    expect(existsSync(join(dir, "beta", "agent.yaml"))).toBe(true);
  });

  it("returns 0 for platforms with no known scan (e.g. cursor)", () => {
    const dir = initAgentsDir();
    expect(adoptExistingAgents(tmpDir, ["cursor"], dir, skillsDir())).toEqual({
      agents: [],
      skills: [],
    });
  });

  it("rejects a claude agent whose frontmatter name escapes agentsDir", () => {
    writeClaudeAgent(
      "evil",
      '---\nname: "../../evil-escape"\ndescription: Bad\n---\n\nPayload.\n'
    );
    const dir = initAgentsDir();
    const adopted = adoptExistingAgents(tmpDir, ["claude"], dir, skillsDir());

    expect(adopted.agents).toEqual([]);
    expect(existsSync(join(tmpDir, "evil-escape"))).toBe(false);
    expect(existsSync(join(tmpDir, ".agentquilt", "evil-escape"))).toBe(false);
  });

  it("rejects an absolute path in frontmatter name", () => {
    const escapeTarget = join(tmpDir, "abs-escape");
    writeClaudeAgent(
      "abs",
      `---\nname: ${JSON.stringify(escapeTarget)}\ndescription: Bad\n---\n\nPayload.\n`
    );
    const dir = initAgentsDir();

    expect(adoptExistingAgents(tmpDir, ["claude"], dir, skillsDir()).agents).toEqual([]);
    expect(existsSync(escapeTarget)).toBe(false);
  });

  function writeSkill(dirName: string, content: string): void {
    const dir = join(tmpDir, ".agents", "skills", dirName);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), content, "utf8");
  }

  it("adopts an agentskills skill into the skills source directory", () => {
    writeSkill("helper", "---\nname: helper\ndescription: Helps out\n---\n\nYou help.\n");
    const dir = initAgentsDir();
    const sDir = initSkillsDir();
    const adopted = adoptExistingAgents(tmpDir, ["agentskills"], dir, sDir);

    expect(adopted.skills).toHaveLength(1);
    const skillYaml = readFileSync(join(sDir, "helper", "agent.yaml"), "utf8");
    expect(skillYaml).toContain('description: "Helps out"');
    expect(skillYaml).toContain("model: inherit");
    expect(skillYaml).not.toContain("permissions:");
    expect(readFileSync(join(sDir, "helper", "010-instructions.md"), "utf8")).toContain("You help.");
  });

  it("skips an agentskills skill whose source dir already exists", () => {
    writeSkill("helper", "---\nname: helper\ndescription: Helps out\n---\n\nYou help.\n");
    const dir = initAgentsDir();
    const sDir = initSkillsDir();
    mkdirSync(join(sDir, "helper"), { recursive: true });

    expect(adoptExistingAgents(tmpDir, ["agentskills"], dir, sDir).skills).toEqual([]);
  });

  it("rejects an agentskills skill whose frontmatter name escapes the skills dir", () => {
    writeSkill(
      "evil-skill",
      '---\nname: "../../../skill-escape"\ndescription: Bad\n---\n\nPayload.\n'
    );
    const dir = initAgentsDir();

    expect(adoptExistingAgents(tmpDir, ["agentskills"], dir, skillsDir()).skills).toEqual([]);
    expect(existsSync(join(tmpDir, "skill-escape"))).toBe(false);
  });
});

// --- initProject integration ---

describe("initProject integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "aq-init-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("adopts existing .claude/agents/*.md files on init", () => {
    // Set up pre-existing claude agent
    const claudeDir = join(tmpDir, ".claude", "agents");
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      join(claudeDir, "reviewer.md"),
      "---\nname: reviewer\ndescription: Reviews code\nmodel: sonnet\ntools: Read, Grep, Glob\n---\n\nYou are a reviewer.\n",
      "utf8"
    );

    // initProject calls process.exit; intercept it. Track first call only —
    // subsequent calls (from the error catch block) are no-ops so the exception
    // can propagate cleanly.
    const origExit = process.exit.bind(process);
    let alreadyExited = false;
    process.exit = ((code?: number) => {
      if (!alreadyExited) {
        alreadyExited = true;
        if (code !== 0) throw new Error(`process.exit called with ${code}`);
        throw new Error("__exit_ok__");
      }
    }) as typeof process.exit;

    try {
      initProject(tmpDir, ["claude"]);
    } catch (e) {
      if (!(e instanceof Error && e.message === "__exit_ok__")) throw e;
    } finally {
      process.exit = origExit;
    }

    const agentYaml = readFileSync(
      join(tmpDir, ".agentquilt", "agents", "reviewer", "agent.yaml"),
      "utf8"
    );
    expect(agentYaml).toContain('description: "Reviews code"');
    expect(agentYaml).toContain("model: balanced");
    expect(agentYaml).toContain("permissions: read-only");

    const roleBlock = readFileSync(
      join(tmpDir, ".agentquilt", "agents", "reviewer", "010-role.md"),
      "utf8"
    );
    expect(roleBlock).toContain("You are a reviewer.");
  });

  // Returns the first exit code initProject reports, without letting it
  // terminate the test process.
  function runInit(dir: string, platforms: string[], force?: boolean): number {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    try {
      initProject(dir, platforms, force);
      return (exitSpy.mock.calls[0]?.[0] as number | undefined) ?? 0;
    } finally {
      exitSpy.mockRestore();
    }
  }

  it("refuses to overwrite an existing .agentquilt/config.yaml", () => {
    const aqDir = join(tmpDir, ".agentquilt");
    mkdirSync(aqDir, { recursive: true });
    const existingConfig = "version: 1\nsourceDir: custom/agents\n";
    writeFileSync(join(aqDir, "config.yaml"), existingConfig, "utf8");

    const code = runInit(tmpDir, ["claude"]);

    expect(code).toBe(2);
    expect(readFileSync(join(aqDir, "config.yaml"), "utf8")).toBe(existingConfig);
  });

  it("refuses when only .agentquilt/config.json exists", () => {
    const aqDir = join(tmpDir, ".agentquilt");
    mkdirSync(aqDir, { recursive: true });
    writeFileSync(join(aqDir, "config.json"), "{\"version\": 1}\n", "utf8");

    expect(runInit(tmpDir, ["claude"])).toBe(2);
    expect(existsSync(join(aqDir, "config.yaml"))).toBe(false);
  });

  it("overwrites existing config when force is true", () => {
    const aqDir = join(tmpDir, ".agentquilt");
    mkdirSync(aqDir, { recursive: true });
    writeFileSync(join(aqDir, "config.yaml"), "version: 1\nsourceDir: custom/agents\n", "utf8");

    const code = runInit(tmpDir, ["claude"], true);

    expect(code).toBe(0);
    const config = readFileSync(join(aqDir, "config.yaml"), "utf8");
    expect(config).toContain("sourceDir: .agentquilt/agents");
  });

  it("never overwrites an existing .gitattributes, even with force", () => {
    const existing = "*.bin -text\n";
    writeFileSync(join(tmpDir, ".gitattributes"), existing, "utf8");

    expect(runInit(tmpDir, ["claude"])).toBe(0);
    expect(readFileSync(join(tmpDir, ".gitattributes"), "utf8")).toBe(existing);

    expect(runInit(tmpDir, ["claude"], true)).toBe(0);
    expect(readFileSync(join(tmpDir, ".gitattributes"), "utf8")).toBe(existing);
  });
});
