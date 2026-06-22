import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { tmpdir } from "os";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";
import { getAdapter } from "../src/core/adapters/index.js";
import { loadAgentDir } from "../src/core/agentLoader.js";
import { resolveModel } from "../src/core/modelResolver.js";
import type { AgentQuiltConfig } from "../src/schemas/config.schema.js";
// Import the adapter to register it
import "../src/core/adapters/claude.js";

describe("claudeAdapter", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = path.join(tmpdir(), `agentquilt-claude-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function setupAgentFixture(
    dirName: string,
    agentYaml: string,
    fragments: Record<string, string>
  ): string {
    const agentDir = path.join(tempDir, dirName);
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, "agent.yaml"), agentYaml, "utf8");
    for (const [filename, content] of Object.entries(fragments)) {
      writeFileSync(path.join(agentDir, filename), content, "utf8");
    }
    return agentDir;
  }

  function createMinimalConfig(modelTiers?: Record<string, Record<string, string>>): AgentQuiltConfig {
    return {
      version: 1,
      sourceDir: "agents",
      targets: [
        {
          kind: "document",
          output: "AGENTS.md",
          include: ["test"],
        },
      ],
      defaultModelTier: undefined,
      modelTiers,
    };
  }

  it("scenario 1: basic read-only with balanced tier", () => {
    const agentDir = setupAgentFixture(
      "test-scenario-1",
      `description: "A code review expert"
model: balanced
permissions: read-only
`,
      {
        "010-role.md": "You are a code reviewer.\n",
        "020-criteria.md": "Focus on style and performance.\n",
      }
    );

    const adapter = getAdapter("claude");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig({
      balanced: { claude: "claude-sonnet-4-6" },
    });
    const resolvedModel = resolveModel(record.definition, "claude", config);

    const outputs = adapter.outputsFor(record, resolvedModel, config);

    expect(outputs).toHaveLength(1);
    expect(outputs[0].path).toBe(".claude/agents/test-scenario-1.md");
    expect(outputs[0].kind).toBe("file");

    // Check frontmatter
    const content = outputs[0].content;
    expect(content).toContain("---");
    expect(content).toContain("name: test-scenario-1");
    expect(content).toContain('description: A code review expert');
    expect(content).toContain("model: claude-sonnet-4-6");
    expect(content).toContain("tools: Read, Grep, Glob");

    // Check body is assembled
    expect(content).toContain("You are a code reviewer");
    expect(content).toContain("Focus on style and performance");
  });

  it("scenario 2: model null (inherit) — no model line", () => {
    const agentDir = setupAgentFixture(
      "test-scenario-2",
      `description: "Inherits from parent"
model: inherit
permissions: read-only
`,
      {
        "010-role.md": "I inherit from parent.\n",
      }
    );

    const adapter = getAdapter("claude");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig({});
    const resolvedModel = resolveModel(record.definition, "claude", config);

    const outputs = adapter.outputsFor(record, resolvedModel, config);
    const content = outputs[0].content;

    // Should NOT have a model line
    const lines = content.split("\n");
    const yamlStart = lines.findIndex((l) => l === "---");
    const yamlEnd = lines.findIndex((l, i) => i > yamlStart && l === "---");
    const yamlSection = lines.slice(yamlStart + 1, yamlEnd).join("\n");

    expect(yamlSection).not.toMatch(/^model:/m);
  });

  it("scenario 3: reasoning high — effort line", () => {
    const agentDir = setupAgentFixture(
      "test-scenario-3",
      `description: "Deep thinker"
model:
  tier: balanced
  reasoning: high
permissions: read-only
`,
      {
        "010-role.md": "Think deeply about problems.\n",
      }
    );

    const adapter = getAdapter("claude");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig({
      balanced: { claude: "claude-sonnet-4-6" },
    });
    const resolvedModel = resolveModel(record.definition, "claude", config);

    const outputs = adapter.outputsFor(record, resolvedModel, config);
    const content = outputs[0].content;

    expect(content).toContain("effort: high");
  });

  it("scenario 4: permissions workspace — no tools line", () => {
    const agentDir = setupAgentFixture(
      "test-scenario-4",
      `description: "Workspace editor"
model: balanced
permissions: workspace
`,
      {
        "010-role.md": "Edit workspace files.\n",
      }
    );

    const adapter = getAdapter("claude");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig({
      balanced: { claude: "claude-sonnet-4-6" },
    });
    const resolvedModel = resolveModel(record.definition, "claude", config);

    const outputs = adapter.outputsFor(record, resolvedModel, config);
    const content = outputs[0].content;

    // Should NOT have tools line
    const lines = content.split("\n");
    const yamlStart = lines.findIndex((l) => l === "---");
    const yamlEnd = lines.findIndex((l, i) => i > yamlStart && l === "---");
    const yamlSection = lines.slice(yamlStart + 1, yamlEnd).join("\n");

    expect(yamlSection).not.toMatch(/^tools:/m);
  });

  it("scenario 5: permissions full — permissionMode acceptEdits", () => {
    const agentDir = setupAgentFixture(
      "test-scenario-5",
      `description: "Full editor"
model: balanced
permissions: full
`,
      {
        "010-role.md": "You have full edit access.\n",
      }
    );

    const adapter = getAdapter("claude");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig({
      balanced: { claude: "claude-sonnet-4-6" },
    });
    const resolvedModel = resolveModel(record.definition, "claude", config);

    const outputs = adapter.outputsFor(record, resolvedModel, config);
    const content = outputs[0].content;

    // Should have permissionMode: acceptEdits
    expect(content).toContain("permissionMode: acceptEdits");
    // Should NOT have tools line
    const lines = content.split("\n");
    const yamlStart = lines.findIndex((l) => l === "---");
    const yamlEnd = lines.findIndex((l, i) => i > yamlStart && l === "---");
    const yamlSection = lines.slice(yamlStart + 1, yamlEnd).join("\n");

    expect(yamlSection).not.toMatch(/^tools:/m);
  });

  it("scenario 6: x-claude color override", () => {
    const agentDir = setupAgentFixture(
      "test-scenario-6",
      `description: "Colorful agent"
model: balanced
permissions: read-only
x-claude:
  color: blue
`,
      {
        "010-role.md": "I am blue.\n",
      }
    );

    const adapter = getAdapter("claude");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig({
      balanced: { claude: "claude-sonnet-4-6" },
    });
    const resolvedModel = resolveModel(record.definition, "claude", config);

    const outputs = adapter.outputsFor(record, resolvedModel, config);
    const content = outputs[0].content;

    expect(content).toContain("color: blue");
  });

  it("scenario 7: x-claude tools override", () => {
    const agentDir = setupAgentFixture(
      "test-scenario-7",
      `description: "Custom tools agent"
model: balanced
permissions: read-only
x-claude:
  tools: "WebFetch, WebSearch"
`,
      {
        "010-role.md": "I have custom tools.\n",
      }
    );

    const adapter = getAdapter("claude");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig({
      balanced: { claude: "claude-sonnet-4-6" },
    });
    const resolvedModel = resolveModel(record.definition, "claude", config);

    const outputs = adapter.outputsFor(record, resolvedModel, config);
    const content = outputs[0].content;

    // Should have custom tools, not default
    expect(content).toContain('tools: WebFetch, WebSearch');
    expect(content).not.toContain("tools: Read, Grep, Glob");
  });
});
