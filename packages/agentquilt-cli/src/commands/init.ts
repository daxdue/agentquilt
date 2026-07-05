import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from "fs";
import { join, basename, extname } from "path";
import { parse as parseYaml } from "yaml";
import type { Command } from "commander";

const ADAPTER_PLATFORMS = ["claude", "agentskills"];
const PRESET_PLATFORMS = ["cursor", "copilot", "gemini"];
const ALL_PLATFORMS = [...ADAPTER_PLATFORMS, ...PRESET_PLATFORMS];

const PLATFORM_DESCRIPTIONS: Record<string, { type: string; output: string }> = {
  claude: { type: "adapter", output: ".claude/agents/<name>.md (per agent)" },
  agentskills: { type: "adapter", output: ".agents/skills/<name>/SKILL.md (per agent)" },
  cursor: { type: "preset", output: ".cursor/rules/<agent>.mdc (combined)" },
  copilot: { type: "preset", output: ".github/copilot-instructions.md (combined)" },
  gemini: { type: "preset", output: "GEMINI.md (combined)" },
};

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize a new AgentQuilt project")
    .option("--dir <path>", "project directory", process.cwd())
    .option(
      "--platform <platforms>",
      "comma-separated platform list or repeated --platform flags (default: claude)",
      (value: string, prev: string[]) => {
        const platforms = value.split(",").map((p: string) => p.trim());
        return prev ? [...prev, ...platforms] : platforms;
      }
    )
    .action((options: { dir?: string; platform?: string[] }) => {
      const dir = options.dir || process.cwd();
      const platforms = options.platform || ["claude"];

      initProject(dir, platforms);
    });
}

export function initProject(dir: string, platforms: string[]): void {
  try {
    console.log("Initializing AgentQuilt project...\n");

    // Validate platforms
    const invalidPlatforms = platforms.filter((p) => !ALL_PLATFORMS.includes(p));
    if (invalidPlatforms.length > 0) {
      throw new Error(
        `Invalid platform(s): ${invalidPlatforms.join(", ")}. Valid platforms: ${ALL_PLATFORMS.join(", ")}`
      );
    }

    // Create .agentquilt/agents source directory
    const agentsDir = join(dir, ".agentquilt", "agents");
    mkdirSync(agentsDir, { recursive: true });

    // Generate config file based on selected platforms
    const configContent = generateConfig(platforms);
    writeFileSync(join(dir, ".agentquilt", "config.yaml"), configContent, "utf8");
    console.log("✓ created .agentquilt/config.yaml");

    // Create .gitattributes (spec §7.1)
    const gitattributesContent = `# normalize line endings everywhere — primary CRLF defense in the working tree
* text=auto eol=lf
.agentquilt/**/*.md text eol=lf

# mark generated outputs (collapses diffs, signals "do not edit")
AGENTS.md            linguist-generated=true
CLAUDE.md            linguist-generated=true
GEMINI.md            linguist-generated=true
.cursor/rules/**     linguist-generated=true
.github/copilot-instructions.md linguist-generated=true
.agents/skills/**    linguist-generated=true

# lock: structured to rarely conflict; union as a free win where honored
agentquilt.lock      linguist-generated=true merge=union
`;
    writeFileSync(join(dir, ".gitattributes"), gitattributesContent, "utf8");
    console.log("✓ created .gitattributes");

    // Scan for existing agents and adopt them into the source directory
    const adopted = adoptExistingAgents(dir, platforms, agentsDir);
    if (adopted > 0) {
      console.log(`✓ adopted ${adopted} existing agent(s) into .agentquilt/agents/`);
    }

    console.log("\n✓ Project initialized successfully!");
    console.log("\nConfigured platforms:");
    for (const platform of platforms) {
      const desc = PLATFORM_DESCRIPTIONS[platform];
      if (desc) {
        console.log(`  ${platform}  →  ${desc.output}`);
      }
    }
    console.log("\nNext steps:");
    if (adopted > 0) {
      console.log("  1. Review the adopted agents under .agentquilt/agents/");
      console.log("  2. Run: agentquilt build");
      console.log("  3. Commit agentquilt.lock and your .agentquilt/ sources");
    } else {
      console.log("  1. Run: agentquilt agents add <name>");
      console.log("  2. Edit .agentquilt/agents/<name>/010-role.md and other blocks");
      console.log("  3. Run: agentquilt build");
      console.log("  4. Commit agentquilt.lock and platform-specific agent files");
    }
    console.log("\nFor more info: https://agentquilt.dev");

    process.exit(0);
  } catch (err) {
    console.error(
      `✗ Init failed: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(3);
  }
}

export function generateConfig(platforms: string[]): string {
  const adapterPlatforms = platforms.filter((p) => ADAPTER_PLATFORMS.includes(p));
  const presetPlatforms = platforms.filter((p) => PRESET_PLATFORMS.includes(p));

  let config = `version: 1
sourceDir: .agentquilt/agents
defaultModelTier: balanced

modelTiers:
  balanced:
    claude: claude-sonnet-4-6
`;

  // Add agentskills model mapping if it's in the platforms
  if (adapterPlatforms.includes("agentskills")) {
    config += `    agentskills: placeholder
`;
  }

  config += `  frontier:
    claude: claude-opus-4-8
`;

  if (adapterPlatforms.includes("agentskills")) {
    config += `    agentskills: placeholder
`;
  }

  config += `  fast:
    claude: claude-haiku-4-5-20251001
`;

  if (adapterPlatforms.includes("agentskills")) {
    config += `    agentskills: placeholder
`;
  }

  config += `
targets:
`;

  // Add adapter-based target if any adapter platforms selected
  if (adapterPlatforms.length > 0) {
    config += `  - kind: agent-definitions
    agents: "*"
    platforms: [${adapterPlatforms.map((p) => `${p}`).join(", ")}]
`;
    if (presetPlatforms.length > 0) {
      config += "\n";
    }
  }

  // Add preset-based targets for each preset platform
  for (const preset of presetPlatforms) {
    config += `  - preset: ${preset}
    include: []
`;
    if (presetPlatforms.indexOf(preset) < presetPlatforms.length - 1) {
      config += "\n";
    }
  }

  return config;
}

// --- Existing agent discovery helpers ---

export function parseFrontmatter(content: string): { fm: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { fm: {}, body: content };
  let parsed: unknown;
  try {
    parsed = parseYaml(match[1]);
  } catch {
    return { fm: {}, body: content };
  }
  const fm = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  return { fm, body: match[2].trimStart() };
}

export function reverseMapModel(shortname: unknown): string | undefined {
  if (shortname === "sonnet") return "balanced";
  if (shortname === "opus") return "frontier";
  if (shortname === "haiku") return "fast";
  return undefined;
}

export function reverseMapPermissions(tools: unknown, permissionMode: unknown): string {
  if (permissionMode === "acceptEdits") return "full";
  if (typeof tools === "string" && tools.length > 0) return "read-only";
  return "workspace";
}

const PLATFORM_SCAN: Record<string, { dir: string; glob: string }> = {
  claude: { dir: ".claude/agents", glob: "*.md" },
  agentskills: { dir: ".agents/skills", glob: "*/SKILL.md" },
};

export function adoptExistingAgents(cwd: string, platforms: string[], agentsDir: string): number {
  let count = 0;

  for (const platform of platforms) {
    const scan = PLATFORM_SCAN[platform];
    if (!scan) continue;

    const scanDir = join(cwd, scan.dir);
    if (!existsSync(scanDir)) continue;

    if (platform === "claude") {
      count += adoptClaudeAgents(scanDir, agentsDir);
    } else if (platform === "agentskills") {
      count += adoptAgentSkillsAgents(scanDir, agentsDir);
    }
  }

  return count;
}

function adoptClaudeAgents(scanDir: string, agentsDir: string): number {
  let count = 0;
  const entries = readdirSync(scanDir, { withFileTypes: true })
    .filter((e) => e.isFile() && extname(e.name) === ".md")
    .sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)));

  for (const entry of entries) {
    const filePath = join(scanDir, entry.name);
    const content = readFileSync(filePath, "utf8");
    const { fm, body } = parseFrontmatter(content);

    // Derive name: prefer frontmatter name, fall back to filename stem
    const name = typeof fm["name"] === "string" && fm["name"].length > 0
      ? fm["name"]
      : basename(entry.name, ".md");

    const agentDir = join(agentsDir, name);
    if (existsSync(agentDir)) continue;

    const description = typeof fm["description"] === "string" && fm["description"].length > 0
      ? fm["description"]
      : `Adopted from .claude/agents/${entry.name}`;

    const modelTier = reverseMapModel(fm["model"]);
    const permissions = reverseMapPermissions(fm["tools"], fm["permissionMode"]);

    mkdirSync(agentDir, { recursive: true });
    writeAgentYaml(agentDir, description, modelTier, permissions);
    writeRoleBlock(agentDir, body);

    console.log(`  ✓ adopted ${name} from .claude/agents/${entry.name}`);
    count++;
  }

  return count;
}

function adoptAgentSkillsAgents(scanDir: string, agentsDir: string): number {
  let count = 0;
  const skillDirs = readdirSync(scanDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)));

  for (const skillDir of skillDirs) {
    const skillFile = join(scanDir, skillDir.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;

    const content = readFileSync(skillFile, "utf8");
    const { fm, body } = parseFrontmatter(content);

    const name = typeof fm["name"] === "string" && fm["name"].length > 0
      ? fm["name"]
      : skillDir.name;

    const agentDir = join(agentsDir, name);
    if (existsSync(agentDir)) continue;

    const description = typeof fm["description"] === "string" && fm["description"].length > 0
      ? fm["description"]
      : `Adopted from .agents/skills/${skillDir.name}/SKILL.md`;

    mkdirSync(agentDir, { recursive: true });
    writeAgentYaml(agentDir, description, undefined, "workspace");
    writeRoleBlock(agentDir, body);

    console.log(`  ✓ adopted ${name} from .agents/skills/${skillDir.name}/SKILL.md`);
    count++;
  }

  return count;
}

function writeAgentYaml(
  agentDir: string,
  description: string,
  modelTier: string | undefined,
  permissions: string
): void {
  let yaml = `description: ${JSON.stringify(description)}\n`;
  if (modelTier !== undefined) {
    yaml += `model: ${modelTier}\n`;
  }
  yaml += `permissions: ${permissions}\n`;
  writeFileSync(join(agentDir, "agent.yaml"), yaml, "utf8");
}

function writeRoleBlock(agentDir: string, body: string): void {
  const content = body.endsWith("\n") ? body : body + "\n";
  writeFileSync(join(agentDir, "010-role.md"), content, "utf8");
}
