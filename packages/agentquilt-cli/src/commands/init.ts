import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
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

    console.log("\n✓ Project initialized successfully!");
    console.log("\nConfigured platforms:");
    for (const platform of platforms) {
      const desc = PLATFORM_DESCRIPTIONS[platform];
      if (desc) {
        console.log(`  ${platform}  →  ${desc.output}`);
      }
    }
    console.log("\nNext steps:");
    console.log("  1. Run: agentquilt agents add <name>");
    console.log("  2. Edit .agentquilt/agents/<name>/010-role.md and other blocks");
    console.log("  3. Run: agentquilt build");
    console.log("  4. Commit agentquilt.lock and platform-specific agent files");
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
