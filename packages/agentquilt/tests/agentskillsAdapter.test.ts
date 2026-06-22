import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { tmpdir } from "os";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";
import { getAdapter } from "../src/core/adapters/index.js";
import { loadAgentDir } from "../src/core/agentLoader.js";
import type { AgentQuiltConfig } from "../src/schemas/config.schema.js";
// Import the adapter to register it
import "../src/core/adapters/agentskills.js";

describe("agentskillsAdapter", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = path.join(tmpdir(), `agentquilt-skills-test-${Date.now()}`);
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

  function createMinimalConfig(): AgentQuiltConfig {
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
    };
  }

  it("scenario 1: basic skill with description", () => {
    const agentDir = setupAgentFixture(
      "pdf-processor",
      `description: "Extract and process PDF files"
`,
      {
        "010-role.md": "You are a PDF processing expert.\n",
        "020-usage.md": "Use this skill to handle PDF documents.\n",
      }
    );

    const adapter = getAdapter("agentskills");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig();

    const outputs = adapter.outputsFor(record, undefined as any, config);

    expect(outputs).toHaveLength(1);
    expect(outputs[0].path).toBe(".agents/skills/pdf-processor/SKILL.md");
    expect(outputs[0].kind).toBe("file");

    // Check frontmatter
    const content = outputs[0].content;
    expect(content).toContain("---");
    expect(content).toContain("name: pdf-processor");
    expect(content).toContain("description: Extract and process PDF files");

    // Check body is assembled
    expect(content).toContain("You are a PDF processing expert");
    expect(content).toContain("Use this skill to handle PDF documents");
  });

  it("scenario 2: x-agentskills.license passthrough", () => {
    const agentDir = setupAgentFixture(
      "licensed-skill",
      `description: "A licensed skill"
x-agentskills:
  license: Apache-2.0
`,
      {
        "010-role.md": "Licensed skill.\n",
      }
    );

    const adapter = getAdapter("agentskills");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig();

    const outputs = adapter.outputsFor(record, undefined as any, config);
    const content = outputs[0].content;

    expect(content).toContain("license: Apache-2.0");
  });

  it("scenario 3: x-agentskills.compatibility passthrough", () => {
    const agentDir = setupAgentFixture(
      "system-skill",
      `description: "Requires specific environment"
x-agentskills:
  compatibility: "Requires git and docker"
`,
      {
        "010-role.md": "System skill.\n",
      }
    );

    const adapter = getAdapter("agentskills");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig();

    const outputs = adapter.outputsFor(record, undefined as any, config);
    const content = outputs[0].content;

    expect(content).toContain("compatibility: Requires git and docker");
  });

  it("scenario 4: x-agentskills.allowed-tools passthrough", () => {
    const agentDir = setupAgentFixture(
      "tool-skill",
      `description: "Skill with pre-approved tools"
x-agentskills:
  allowed-tools: "Bash Read WebFetch"
`,
      {
        "010-role.md": "Tool skill.\n",
      }
    );

    const adapter = getAdapter("agentskills");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig();

    const outputs = adapter.outputsFor(record, undefined as any, config);
    const content = outputs[0].content;

    expect(content).toContain("allowed-tools: Bash Read WebFetch");
  });

  it("scenario 5: x-agentskills.metadata passthrough", () => {
    const agentDir = setupAgentFixture(
      "versioned-skill",
      `description: "Skill with metadata"
x-agentskills:
  metadata:
    author: example-org
    version: "1.0"
`,
      {
        "010-role.md": "Versioned skill.\n",
      }
    );

    const adapter = getAdapter("agentskills");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig();

    const outputs = adapter.outputsFor(record, undefined as any, config);
    const content = outputs[0].content;

    expect(content).toContain("author: example-org");
    expect(content).toContain('version: "1.0"');
  });

  it("scenario 6: name normalization to kebab-case", () => {
    const agentDir = setupAgentFixture(
      "MyPdfProcessor",
      `description: "Mixed case name"
`,
      {
        "010-role.md": "Normalized skill.\n",
      }
    );

    const adapter = getAdapter("agentskills");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig();

    const outputs = adapter.outputsFor(record, undefined as any, config);

    // Path should be kebab-cased
    expect(outputs[0].path).toBe(".agents/skills/my-pdf-processor/SKILL.md");

    // Frontmatter name should also be kebab-cased
    const content = outputs[0].content;
    expect(content).toContain("name: my-pdf-processor");
  });

  it("scenario 7: no model field (platform-agnostic)", () => {
    const agentDir = setupAgentFixture(
      "platform-agnostic",
      `description: "No model specified"
model: balanced
`,
      {
        "010-role.md": "Platform agnostic.\n",
      }
    );

    const adapter = getAdapter("agentskills");
    expect(adapter).toBeDefined();
    if (!adapter) return;

    const record = loadAgentDir(agentDir, tempDir);
    const config = createMinimalConfig();

    const outputs = adapter.outputsFor(record, undefined as any, config);
    const content = outputs[0].content;

    // Should NOT have a model line
    const lines = content.split("\n");
    const yamlStart = lines.findIndex((l) => l === "---");
    const yamlEnd = lines.findIndex((l, i) => i > yamlStart && l === "---");
    const yamlSection = lines.slice(yamlStart + 1, yamlEnd).join("\n");

    expect(yamlSection).not.toMatch(/^model:/m);
  });
});
