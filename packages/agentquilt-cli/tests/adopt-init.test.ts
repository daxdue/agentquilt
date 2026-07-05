import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

  function initAgentsDir(): string {
    const dir = agentsDir();
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  it("returns 0 when no .claude/agents/ directory exists", () => {
    const dir = initAgentsDir();
    expect(adoptExistingAgents(tmpDir, ["claude"], dir)).toBe(0);
  });

  it("adopts a claude agent with full frontmatter", () => {
    writeClaudeAgent(
      "my-agent",
      "---\nname: my-agent\ndescription: Does things\nmodel: sonnet\ntools: Read, Grep, Glob\n---\n\nYou are helpful.\n"
    );
    const dir = initAgentsDir();
    const count = adoptExistingAgents(tmpDir, ["claude"], dir);

    expect(count).toBe(1);

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
    adoptExistingAgents(tmpDir, ["claude"], dir);

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
    adoptExistingAgents(tmpDir, ["claude"], dir);

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

    const count = adoptExistingAgents(tmpDir, ["claude"], dir);
    expect(count).toBe(0);

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
    adoptExistingAgents(tmpDir, ["claude"], dir);

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
    adoptExistingAgents(tmpDir, ["claude"], dir);

    const yaml = readFileSync(join(dir, "no-desc", "agent.yaml"), "utf8");
    expect(yaml).toContain("Adopted from .claude/agents/no-desc.md");
  });

  it("adopts multiple agents and returns correct count", () => {
    writeClaudeAgent("alpha", "---\nname: alpha\ndescription: Alpha\nmodel: sonnet\n---\n\nAlpha.\n");
    writeClaudeAgent("beta", "---\nname: beta\ndescription: Beta\nmodel: opus\n---\n\nBeta.\n");
    const dir = initAgentsDir();
    const count = adoptExistingAgents(tmpDir, ["claude"], dir);

    expect(count).toBe(2);
    expect(existsSync(join(dir, "alpha", "agent.yaml"))).toBe(true);
    expect(existsSync(join(dir, "beta", "agent.yaml"))).toBe(true);
  });

  it("returns 0 for platforms with no known scan (e.g. cursor)", () => {
    const dir = initAgentsDir();
    expect(adoptExistingAgents(tmpDir, ["cursor"], dir)).toBe(0);
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
});
