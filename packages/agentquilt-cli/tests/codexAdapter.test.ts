import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { parse as tomlParse } from "smol-toml";
import { getAdapter } from "../src/core/adapters/index.js";
import { loadAgentDir } from "../src/core/agentLoader.js";
import { resolveModel } from "../src/core/modelResolver.js";
import type { AgentQuiltConfig } from "../src/schemas/config.schema.js";
import "../src/core/adapters/codex.js";

describe("codexAdapter", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(tmpdir(), `agentquilt-codex-test-${Date.now()}-${Math.random()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function setupAgent(
    name: string,
    manifest: string,
    fragments: Record<string, string> = { "010-role.md": "Act carefully.\n" }
  ): string {
    const agentDir = path.join(tempDir, name);
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, "agent.yaml"), manifest, "utf8");
    for (const [fileName, content] of Object.entries(fragments)) {
      writeFileSync(path.join(agentDir, fileName), content, "utf8");
    }
    return agentDir;
  }

  function config(
    modelTiers?: Record<string, Record<string, string>>
  ): AgentQuiltConfig {
    return {
      version: 1,
      sourceDir: "agents",
      targets: [],
      modelTiers,
    };
  }

  function compile(agentDir: string, cfg: AgentQuiltConfig = config()) {
    const adapter = getAdapter("codex");
    expect(adapter).toBeDefined();
    const record = loadAgentDir(agentDir, tempDir);
    const model = resolveModel(record.definition, "codex", cfg);
    return adapter!.outputsFor(record, model, cfg)[0];
  }

  function expectCompileError(
    name: string,
    manifest: string,
    expectedField: string,
    fragments?: Record<string, string>
  ): void {
    const agentDir = setupAgent(name, manifest, fragments);
    expect(() => compile(agentDir)).toThrow(`Agent "${name}"`);
    expect(() => compile(agentDir)).toThrow(expectedField);
  }

  it("reports adapter version 2", () => {
    expect(getAdapter("codex")?.ADAPTER_VERSION).toBe("2");
  });

  it("emits standalone parseable TOML with required fields and exact body order", () => {
    const agentDir = setupAgent(
      "reviewer",
      'description: "Reviews quotes like \\"this\\""\nmodel: inherit\n',
      {
        "010-role.md": "First line.\nSecond line.\n",
        "020-rules.md": "Then review carefully.\n",
      }
    );

    const output = compile(agentDir);
    const parsed = tomlParse(output.content);

    expect(output.path).toBe(".codex/agents/reviewer.toml");
    expect(output.kind).toBe("file");
    expect(output.content).toMatch(/^# agentquilt:/);
    expect(output.content).not.toContain("<!--");
    expect(parsed.name).toBe("reviewer");
    expect(parsed.description).toBe('Reviews quotes like "this"');
    expect(parsed.developer_instructions).toBe(
      "First line.\nSecond line.\n\nThen review carefully.\n"
    );
    expect(parsed.model).toBeUndefined();
    expect(parsed.sandbox_mode).toBe("read-only");
  });

  it("validates required fields without trimming valid description or body bytes", () => {
    const output = compile(
      setupAgent(
        "whitespace-preserved",
        'description: "  Preserve description spaces  "\nmodel: inherit\n',
        { "010-role.md": "  Preserve body spaces.  \n" }
      )
    );
    const parsed = tomlParse(output.content);

    expect(parsed.description).toBe("  Preserve description spaces  ");
    expect(parsed.developer_instructions).toBe("  Preserve body spaces.  \n");
  });

  it.each([
    {
      label: "description",
      name: "blank-description",
      manifest: 'description: "   "\nmodel: inherit\n',
      field: "description",
      fragments: undefined,
    },
    {
      label: "missing body fragments",
      name: "missing-body",
      manifest: 'description: "Missing body"\nmodel: inherit\n',
      field: "developer_instructions",
      fragments: {},
    },
    {
      label: "whitespace-only body",
      name: "blank-body",
      manifest: 'description: "Blank body"\nmodel: inherit\n',
      field: "developer_instructions",
      fragments: { "010-role.md": "   \n\n" },
    },
  ])("rejects a blank required $label", ({ name, manifest, field, fragments }) => {
    expectCompileError(name, manifest, field, fragments);
  });

  it("maps configured model, reasoning, and every permission level", () => {
    const cases = [
      ["read-only", "read-only"],
      ["workspace", "workspace-write"],
      ["full", "danger-full-access"],
    ] as const;

    for (const [permission, expectedSandbox] of cases) {
      const agentDir = setupAgent(
        `permission-${permission}`,
        `description: "Permission test"\npermissions: ${permission}\nmodel:\n  tier: balanced\n  reasoning: high\n`
      );
      const output = compile(agentDir, config({ balanced: { codex: "configured-model" } }));
      const parsed = tomlParse(output.content);
      expect(parsed.model).toBe("configured-model");
      expect(parsed.model_reasoning_effort).toBe("high");
      expect(parsed.sandbox_mode).toBe(expectedSandbox);
    }
  });

  it("omits a model by default so Codex inherits its runtime selection", () => {
    const output = compile(setupAgent("inherit-default", 'description: "Default"\n'));
    const parsed = tomlParse(output.content);

    expect(parsed.model).toBeUndefined();
    expect(parsed.model_reasoning_effort).toBeUndefined();
  });

  it("normalizes valid nickname and skills extensions deterministically", () => {
    const agentDir = setupAgent(
      "extended",
      `description: "Extended"
model: inherit
x-codex:
  nickname_candidates: ["  Ada  ", ada, Athena_2, "Code-Reviewer 1"]
  skills:
    config:
      - path: "  /skills/zebra  "
        enabled: false
      - path: /skills/alpha
`
    );

    const first = compile(agentDir).content;
    const second = compile(agentDir).content;
    const parsed = tomlParse(first) as Record<string, any>;

    expect(second).toBe(first);
    expect(parsed.nickname_candidates).toEqual([
      "Ada",
      "ada",
      "Athena_2",
      "Code-Reviewer 1",
    ]);
    expect(parsed.skills.config).toEqual([
      { enabled: false, path: "/skills/zebra" },
      { path: "/skills/alpha" },
    ]);
    expect(first.indexOf("enabled = false")).toBeLessThan(
      first.indexOf('path = "/skills/zebra"')
    );
    expect(first.indexOf('path = "/skills/zebra"')).toBeLessThan(
      first.indexOf('path = "/skills/alpha"')
    );
  });

  it("accepts an empty skills config array", () => {
    const output = compile(
      setupAgent(
        "empty-skills",
        'description: "Empty skills"\nmodel: inherit\nx-codex:\n  skills:\n    config: []\n'
      )
    );
    const parsed = tomlParse(output.content) as Record<string, any>;

    expect(parsed.skills.config).toEqual([]);
  });

  it.each([
    {
      label: "non-array nickname candidates",
      yaml: "  nickname_candidates: Ada\n",
      field: "x-codex.nickname_candidates",
    },
    {
      label: "empty nickname candidates",
      yaml: "  nickname_candidates: []\n",
      field: "x-codex.nickname_candidates",
    },
    {
      label: "non-string nickname candidate",
      yaml: "  nickname_candidates: [Ada, 42]\n",
      field: "x-codex.nickname_candidates[1]",
    },
    {
      label: "blank nickname candidate",
      yaml: '  nickname_candidates: [Ada, "   "]\n',
      field: "x-codex.nickname_candidates[1]",
    },
    {
      label: "nickname candidate with invalid characters",
      yaml: '  nickname_candidates: ["Ada!"]\n',
      field: "x-codex.nickname_candidates[0]",
    },
    {
      label: "duplicate normalized nickname candidate",
      yaml: '  nickname_candidates: [" Ada ", Ada]\n',
      field: "x-codex.nickname_candidates[1]",
    },
  ])("rejects $label", ({ label, yaml, field }) => {
    const name = `bad-nickname-${label.replaceAll(" ", "-")}`;
    expectCompileError(
      name,
      `description: "Bad nickname"\nmodel: inherit\nx-codex:\n${yaml}`,
      field
    );
  });

  it.each([
    {
      label: "null skills",
      yaml: "  skills: null\n",
      field: "x-codex.skills",
    },
    {
      label: "array skills",
      yaml: "  skills: []\n",
      field: "x-codex.skills",
    },
    {
      label: "missing skills config",
      yaml: "  skills: {}\n",
      field: "x-codex.skills.config",
    },
    {
      label: "non-array skills config",
      yaml: "  skills:\n    config: {}\n",
      field: "x-codex.skills.config",
    },
    {
      label: "non-object skills entry",
      yaml: "  skills:\n    config: [alpha]\n",
      field: "x-codex.skills.config[0]",
    },
    {
      label: "missing skills path",
      yaml: "  skills:\n    config:\n      - enabled: true\n",
      field: "x-codex.skills.config[0].path",
    },
    {
      label: "non-string skills path",
      yaml: "  skills:\n    config:\n      - path: 42\n",
      field: "x-codex.skills.config[0].path",
    },
    {
      label: "blank skills path",
      yaml: '  skills:\n    config:\n      - path: "   "\n',
      field: "x-codex.skills.config[0].path",
    },
    {
      label: "non-boolean skills enabled",
      yaml: "  skills:\n    config:\n      - path: /skills/alpha\n        enabled: yes\n",
      field: "x-codex.skills.config[0].enabled",
    },
    {
      label: "unknown skills key",
      yaml: "  skills:\n    config: []\n    extra: true\n",
      field: "x-codex.skills.extra",
    },
    {
      label: "unknown skills entry key",
      yaml: "  skills:\n    config:\n      - path: /skills/alpha\n        extra: true\n",
      field: "x-codex.skills.config[0].extra",
    },
    {
      label: "prototype skills key",
      yaml: '  skills:\n    config: []\n    "__proto__": safe\n',
      field: "x-codex.skills.__proto__",
    },
  ])("rejects $label", ({ label, yaml, field }) => {
    const name = `bad-skills-${label.replaceAll(" ", "-")}`;
    expectCompileError(
      name,
      `description: "Bad skills"\nmodel: inherit\nx-codex:\n${yaml}`,
      field
    );
  });

  it.each([
    "name",
    "description",
    "developer_instructions",
    "model",
    "model_reasoning_effort",
    "sandbox_mode",
  ])("rejects reserved x-codex key %s", (key) => {
    const agentDir = setupAgent(
      `reserved-${key.replaceAll("_", "-")}`,
      `description: "Reserved"\nmodel: inherit\nx-codex:\n  ${key}: forbidden\n`
    );

    expect(() => compile(agentDir)).toThrow(`x-codex key "${key}" collides`);
  });

  it("rejects a non-object x-codex value", () => {
    const agentDir = setupAgent(
      "bad-extension",
      'description: "Bad extension"\nmodel: inherit\nx-codex: invalid\n'
    );

    expect(() => compile(agentDir)).toThrow('field "x-codex" must be an object');
  });

  it("rejects process-launching MCP server extensions", () => {
    const agentDir = setupAgent(
      "unsafe-mcp",
      'description: "Unsafe MCP"\nmodel: inherit\nx-codex:\n  mcp_servers:\n    evil:\n      command: sh\n'
    );

    expect(() => compile(agentDir)).toThrow(
      'x-codex key "mcp_servers" is not supported'
    );
  });
});
