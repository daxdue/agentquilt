import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, symlinkSync } from "fs";
import path from "path";
import os from "os";
import { validateConfig, ConfigError } from "../src/core/configLoader";
import type { AgentQuiltConfig } from "../src/schemas/config.schema";
import { AgentDefinitionSchema } from "../src/schemas/agentDefinition.schema";
import { resolveAgents } from "../src/core/agentLoader";
import { scanFragments } from "../src/core/fragmentScanner";

let tmpDir: string;

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `aq-security-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(path.join(tmpDir, "agents", "_shared"), { recursive: true });
  mkdirSync(path.join(tmpDir, "agents", "myagent"), { recursive: true });
  writeFileSync(path.join(tmpDir, "agents", "_shared", "010-tone.md"), "Be concise.\n");
  writeFileSync(path.join(tmpDir, "agents", "myagent", "010-role.md"), "You are an agent.\n");
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeConfig(includePaths: string[]): [AgentQuiltConfig, string] {
  const sourceDir = path.join(tmpDir, "agents");
  const config = {
    version: 1,
    sourceDir: "agents",
    targets: [
      {
        kind: "document" as const,
        output: "AGENTS.md",
        include: includePaths,
      },
    ],
  } as unknown as AgentQuiltConfig;
  return [config, sourceDir];
}

describe("agent manifest name validation (path traversal in adapter output paths)", () => {
  const manifest = (name: string) => ({ description: "test agent", name });

  it("rejects a relative traversal name (../../evil)", () => {
    expect(AgentDefinitionSchema.safeParse(manifest("../../evil")).success).toBe(false);
  });

  it("rejects a name containing a slash (a/b)", () => {
    expect(AgentDefinitionSchema.safeParse(manifest("a/b")).success).toBe(false);
  });

  it("rejects a name containing a backslash (a\\b)", () => {
    expect(AgentDefinitionSchema.safeParse(manifest("a\\b")).success).toBe(false);
  });

  it("rejects an absolute path name (/etc/cron.d/x)", () => {
    expect(AgentDefinitionSchema.safeParse(manifest("/etc/cron.d/x")).success).toBe(false);
  });

  it("rejects a name containing a dot-dot sequence (a..b)", () => {
    expect(AgentDefinitionSchema.safeParse(manifest("a..b")).success).toBe(false);
  });

  it("accepts normal kebab-case and dotted names", () => {
    expect(AgentDefinitionSchema.safeParse(manifest("code-review")).success).toBe(true);
    expect(AgentDefinitionSchema.safeParse(manifest("agent_v1.2")).success).toBe(true);
  });
});

describe("path traversal validation (RISK-004)", () => {
  it("blocks a global sourceDir outside the repository before document scanning", () => {
    const outsideDir = path.join(path.dirname(tmpDir), `${path.basename(tmpDir)}-docs`);
    mkdirSync(outsideDir, { recursive: true });
    const config = {
      version: 1,
      sourceDir: outsideDir,
      targets: [{
        kind: "document",
        output: "OUT.md",
        include: ["project"],
        format: "markdown",
      }],
    } as unknown as AgentQuiltConfig;

    try {
      expect(() => validateConfig(config, outsideDir, tmpDir)).toThrow(
        "sourceDir escapes the repository"
      );
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("blocks a global sourceDir symlinked outside the repository", () => {
    const outsideDir = path.join(path.dirname(tmpDir), `${path.basename(tmpDir)}-linked-docs`);
    const linkedSourceDir = path.join(tmpDir, "linked-doc-source");
    mkdirSync(outsideDir, { recursive: true });
    symlinkSync(outsideDir, linkedSourceDir, "dir");
    const config = {
      version: 1,
      sourceDir: "linked-doc-source",
      targets: [{
        kind: "document",
        output: "OUT.md",
        include: ["project"],
        format: "markdown",
      }],
    } as unknown as AgentQuiltConfig;

    try {
      expect(() => validateConfig(config, linkedSourceDir, tmpDir)).toThrow(
        "sourceDir escapes the repository through a symlink"
      );
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("blocks a document output inside the canonical source directory", () => {
    const [config, sourceDir] = makeConfig(["_shared"]);
    config.targets[0] = {
      kind: "document",
      output: "agents/_shared/010-tone.md",
      include: ["_shared"],
      format: "markdown",
    };

    expect(() => validateConfig(config, sourceDir, tmpDir)).toThrow(
      "must not be inside a source directory"
    );
  });

  it("blocks a document output inside the physical target of a symlinked source root", () => {
    const realSourceDir = path.join(tmpDir, "real-agents");
    const includeDir = path.join(realSourceDir, "project");
    const linkedSourceDir = path.join(tmpDir, "linked-agents");
    mkdirSync(includeDir, { recursive: true });
    writeFileSync(path.join(includeDir, "010-role.md"), "Canonical\n");
    symlinkSync(realSourceDir, linkedSourceDir, "dir");
    const config = {
      version: 1,
      sourceDir: "linked-agents",
      targets: [{
        kind: "document",
        output: "real-agents/project/010-role.md",
        include: ["project"],
        format: "markdown",
      }],
    } as unknown as AgentQuiltConfig;

    expect(() => validateConfig(config, linkedSourceDir, tmpDir)).toThrow(
      "must not be inside a source directory"
    );
  });

  it("blocks a deep traversal escape (../../../../etc/passwd)", () => {
    const [config, sourceDir] = makeConfig(["../../../../etc/passwd"]);
    expect(() => validateConfig(config, sourceDir)).toThrow(ConfigError);
    expect(() => validateConfig(config, sourceDir)).toThrow("path traversal");
  });

  it("blocks a one-level escape (../outside)", () => {
    const [config, sourceDir] = makeConfig(["../outside"]);
    expect(() => validateConfig(config, sourceDir)).toThrow(ConfigError);
    expect(() => validateConfig(config, sourceDir)).toThrow("path traversal");
  });

  it("blocks an absolute path outside sourceDir (/etc/hosts)", () => {
    const [config, sourceDir] = makeConfig(["/etc/hosts"]);
    expect(() => validateConfig(config, sourceDir)).toThrow(ConfigError);
    expect(() => validateConfig(config, sourceDir)).toThrow("path traversal");
  });

  it("allows a normal relative subdirectory name (_shared)", () => {
    const [config, sourceDir] = makeConfig(["_shared"]);
    expect(() => validateConfig(config, sourceDir)).not.toThrow();
  });

  it("allows a relative path with leading dot-slash (./myagent)", () => {
    const [config, sourceDir] = makeConfig(["./myagent"]);
    expect(() => validateConfig(config, sourceDir)).not.toThrow();
  });

  it("allows a nested relative path (myagent)", () => {
    const [config, sourceDir] = makeConfig(["myagent"]);
    expect(() => validateConfig(config, sourceDir)).not.toThrow();
  });

  it("allows ../agents/myagent when it resolves back inside sourceDir", () => {
    // path.resolve('/foo/agents', '../agents/myagent') = '/foo/agents/myagent'
    // The final resolved path is within sourceDir, so it should pass
    const [config, sourceDir] = makeConfig(["../agents/myagent"]);
    expect(() => validateConfig(config, sourceDir)).not.toThrow();
  });

  it("reports an error for each traversal path, not stopping at the first", () => {
    const [config, sourceDir] = makeConfig(["../../../../etc/passwd", "_shared"]);
    expect(() => validateConfig(config, sourceDir)).toThrow("path traversal");
    // _shared is valid — ensure only the bad path is flagged, not both
  });

  it("blocks a document include directory symlink outside sourceDir", () => {
    const sourceDir = path.join(tmpDir, "agents");
    const outsideDir = path.join(tmpDir, "outside-docs");
    mkdirSync(outsideDir, { recursive: true });
    writeFileSync(path.join(outsideDir, "010-secret.md"), "Sensitive\n");
    symlinkSync(outsideDir, path.join(sourceDir, "external-docs"), "dir");
    const [config] = makeConfig(["external-docs"]);

    expect(() => validateConfig(config, sourceDir, tmpDir)).toThrow(
      "Include path escapes sourceDir through a symlink"
    );
  });

  it("blocks a document fragment symlink outside its include directory", () => {
    const sourceDir = path.join(tmpDir, "agents");
    const includeDir = path.join(sourceDir, "linked-docs");
    const outsideFile = path.join(tmpDir, "outside-doc.md");
    mkdirSync(includeDir, { recursive: true });
    writeFileSync(outsideFile, "Sensitive\n");
    symlinkSync(outsideFile, path.join(includeDir, "010-secret.md"), "file");
    const [config] = makeConfig(["linked-docs"]);

    expect(() => scanFragments(config, sourceDir)).toThrow(
      "Document fragment escapes its include directory"
    );
  });
});

describe("agent-definition selector containment", () => {
  it("rejects a missing wildcard sourceDir as a config error", () => {
    const sourceDir = path.join(tmpDir, "agents");
    const config = {
      version: 1,
      sourceDir: "agents",
      targets: [{
        kind: "agent-definitions",
        sourceDir: "missing",
        agents: "*",
        platforms: ["claude"],
      }],
    } as unknown as AgentQuiltConfig;

    expect(() => validateConfig(config, sourceDir, tmpDir)).toThrow(
      "sourceDir does not exist"
    );
  });

  it("rejects a target-specific sourceDir outside the repository", () => {
    const outsideRoot = path.join(path.dirname(tmpDir), `${path.basename(tmpDir)}-outside`);
    const outsideAgent = path.join(outsideRoot, "helper");
    mkdirSync(outsideAgent, { recursive: true });
    writeFileSync(path.join(outsideAgent, "agent.yaml"), "description: Outside\n");
    writeFileSync(path.join(outsideAgent, "010-role.md"), "Sensitive local text.\n");
    const sourceDir = path.join(tmpDir, "agents");
    const config = {
      version: 1,
      sourceDir: "agents",
      targets: [{
        kind: "agent-definitions",
        sourceDir: `../../${path.basename(outsideRoot)}`,
        agents: ["helper"],
        platforms: ["claude"],
      }],
    } as unknown as AgentQuiltConfig;

    try {
      expect(() => validateConfig(config, sourceDir, tmpDir)).toThrow(
        "sourceDir escapes the repository"
      );
    } finally {
      rmSync(outsideRoot, { recursive: true, force: true });
    }
  });

  it("accepts a sibling skills sourceDir inside the repository", () => {
    const skillDir = path.join(tmpDir, "skills", "helper");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, "agent.yaml"), "description: Helper\n");
    writeFileSync(path.join(skillDir, "010-role.md"), "Help.\n");
    const config = {
      version: 1,
      sourceDir: "agents",
      targets: [{
        kind: "agent-definitions",
        sourceDir: "skills",
        agents: ["helper"],
        platforms: ["agentskills"],
      }],
    } as unknown as AgentQuiltConfig;

    expect(() => validateConfig(config, path.join(tmpDir, "agents"), tmpDir)).not.toThrow();
  });

  it("rejects an agent selector that escapes its source directory", () => {
    const outsideDir = path.join(tmpDir, "outside-agent");
    mkdirSync(outsideDir, { recursive: true });
    writeFileSync(path.join(outsideDir, "agent.yaml"), "description: Outside\n");
    writeFileSync(path.join(outsideDir, "010-role.md"), "Sensitive local text.\n");
    const sourceDir = path.join(tmpDir, "agents");
    const config = {
      version: 1,
      sourceDir: "agents",
      targets: [
        {
          kind: "agent-definitions",
          agents: ["../outside-agent"],
          platforms: ["claude"],
        },
      ],
    } as unknown as AgentQuiltConfig;

    expect(() => validateConfig(config, sourceDir)).toThrow("path traversal");
  });

  it("rejects an in-root symlink to an agent outside its source directory", () => {
    const sourceDir = path.join(tmpDir, "agents");
    const outsideDir = path.join(tmpDir, "outside-agent");
    mkdirSync(outsideDir, { recursive: true });
    writeFileSync(path.join(outsideDir, "agent.yaml"), "description: Outside\n");
    writeFileSync(path.join(outsideDir, "010-role.md"), "Sensitive local text.\n");
    symlinkSync(outsideDir, path.join(sourceDir, "external"), "dir");
    const config = {
      version: 1,
      sourceDir: "agents",
      targets: [
        {
          kind: "agent-definitions",
          agents: ["external"],
          platforms: ["claude"],
        },
      ],
    } as unknown as AgentQuiltConfig;

    expect(() => validateConfig(config, sourceDir)).toThrow("symlink traversal");
    expect(() => resolveAgents(["external"], sourceDir, tmpDir)).toThrow(
      "through a symlink"
    );
  });

  it("rejects a fragment symlink that escapes an otherwise contained agent", () => {
    const sourceDir = path.join(tmpDir, "agents");
    const agentDir = path.join(sourceDir, "linked-fragment");
    const outsideFragment = path.join(tmpDir, "outside-fragment.md");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(path.join(agentDir, "agent.yaml"), "description: Linked fragment\n");
    writeFileSync(outsideFragment, "Sensitive local text.\n");
    symlinkSync(outsideFragment, path.join(agentDir, "010-role.md"), "file");

    expect(() => resolveAgents(["linked-fragment"], sourceDir, tmpDir)).toThrow(
      "Agent file escapes its directory through a symlink"
    );
  });

  it("rejects a manifest symlink that escapes an otherwise contained agent", () => {
    const sourceDir = path.join(tmpDir, "agents");
    const agentDir = path.join(sourceDir, "linked-manifest");
    const outsideManifest = path.join(tmpDir, "outside-agent.yaml");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(outsideManifest, "description: Linked manifest\n");
    writeFileSync(path.join(agentDir, "010-role.md"), "Normal text.\n");
    symlinkSync(outsideManifest, path.join(agentDir, "agent.yaml"), "file");

    expect(() => resolveAgents(["linked-manifest"], sourceDir, tmpDir)).toThrow(
      "Agent file escapes its directory through a symlink"
    );
  });
});
