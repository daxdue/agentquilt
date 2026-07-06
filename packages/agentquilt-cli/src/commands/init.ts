import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from "fs";
import { join, basename, extname, resolve, sep } from "path";
import { parse as parseYaml } from "yaml";
import type { Command } from "commander";
import { ConfigError } from "../core/configLoader.js";
import { bold, cyan, dim, green, sym } from "../ui/terminal.js";

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
    .option(
      "--force",
      "overwrite an existing .agentquilt config (never touches .gitattributes or existing agent sources)"
    )
    .action((options: { dir?: string; platform?: string[]; force?: boolean }) => {
      const dir = options.dir || process.cwd();
      const platforms = options.platform || ["claude"];

      initProject(dir, platforms, options.force ?? false);
    });
}

export function initProject(dir: string, platforms: string[], force = false): void {
  try {
    console.log(`${bold("Initializing AgentQuilt project")}\n`);

    // Validate platforms
    const invalidPlatforms = platforms.filter((p) => !ALL_PLATFORMS.includes(p));
    if (invalidPlatforms.length > 0) {
      throw new ConfigError(
        `Invalid platform(s): ${invalidPlatforms.join(", ")}. Valid platforms: ${ALL_PLATFORMS.join(", ")}`
      );
    }

    // Refuse to clobber an already-initialized project
    if (!force) {
      for (const configName of ["config.yaml", "config.json"]) {
        if (existsSync(join(dir, ".agentquilt", configName))) {
          throw new ConfigError(
            `project already initialized (.agentquilt/${configName} exists). Use --force to overwrite.`
          );
        }
      }
    }

    // Create .agentquilt/agents source directory
    const agentsDir = join(dir, ".agentquilt", "agents");
    mkdirSync(agentsDir, { recursive: true });

    // Skills get their own source directory, sibling to agents/
    const skillsSelected = platforms.includes("agentskills");
    const skillsDir = join(dir, ".agentquilt", "skills");
    if (skillsSelected) {
      mkdirSync(skillsDir, { recursive: true });
    }

    // Scan for existing agents/skills and adopt them into the source directories
    // (before config generation, so preset targets can include them)
    const adopted = adoptExistingAgents(dir, platforms, agentsDir, skillsDir);
    if (adopted.agents.length > 0) {
      console.log(`${sym.ok} adopted ${adopted.agents.length} existing agent(s) into .agentquilt/agents/`);
    }
    if (adopted.skills.length > 0) {
      console.log(`${sym.ok} adopted ${adopted.skills.length} existing skill(s) into .agentquilt/skills/`);
    }

    // Generate config file based on selected platforms
    const configContent = generateConfig(platforms, adopted.agents);
    writeFileSync(join(dir, ".agentquilt", "config.yaml"), configContent, "utf8");
    console.log(`${sym.ok} created .agentquilt/config.yaml`);

    // Create .gitattributes (spec §7.1) — never overwrite an existing one,
    // even with --force: it usually carries non-AgentQuilt rules
    const gitattributesPath = join(dir, ".gitattributes");
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
    if (existsSync(gitattributesPath)) {
      console.log(dim("- skipped .gitattributes (already exists)"));
    } else {
      writeFileSync(gitattributesPath, gitattributesContent, "utf8");
      console.log(`${sym.ok} created .gitattributes`);
    }

    console.log(`\n${green("✓ Project initialized successfully!")}`);
    console.log(`\n${bold("Configured platforms:")}`);
    for (const platform of platforms) {
      const desc = PLATFORM_DESCRIPTIONS[platform];
      if (desc) {
        console.log(`  ${cyan(platform)}  ${dim("→")}  ${dim(desc.output)}`);
      }
    }
    const hasPresetTargets = platforms.some((p) => PRESET_PLATFORMS.includes(p));

    console.log(`\n${bold("Next steps:")}`);
    if (adopted.agents.length > 0 || adopted.skills.length > 0) {
      console.log(`  ${dim("1.")} Review the adopted sources under .agentquilt/`);
      console.log(`  ${dim("2.")} Run: ${cyan("agentquilt build")}`);
      console.log(`  ${dim("3.")} Commit agentquilt.lock and your .agentquilt/ sources`);
    } else {
      let step = 1;
      const addCmds = skillsSelected
        ? `${cyan("agentquilt agents add <name>")} or ${cyan("agentquilt skills add <name>")}`
        : cyan("agentquilt agents add <name>");
      console.log(`  ${dim(`${step++}.`)} Run: ${addCmds}`);
      console.log(`  ${dim(`${step++}.`)} Edit .agentquilt/agents/<name>/010-role.md and other blocks`);
      if (hasPresetTargets) {
        console.log(`  ${dim(`${step++}.`)} List the agent directory under the preset target's include: in .agentquilt/config.yaml`);
      }
      console.log(`  ${dim(`${step++}.`)} Run: ${cyan("agentquilt build")}`);
      console.log(`  ${dim(`${step++}.`)} Commit agentquilt.lock and platform-specific agent files`);
    }
    console.log(`\nFor more info: ${cyan("https://agentquilt.dev")}`);

    process.exit(0);
  } catch (err) {
    console.error(
      `${sym.fail} Init failed: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(err instanceof ConfigError ? 2 : 3);
  }
}

export function generateConfig(platforms: string[], adoptedAgents: string[] = []): string {
  const adapterPlatforms = platforms.filter((p) => ADAPTER_PLATFORMS.includes(p));
  const presetPlatforms = platforms.filter((p) => PRESET_PLATFORMS.includes(p));
  // agentskills compiles skills from their own source root; every other
  // adapter platform compiles agents from the global sourceDir
  const agentPlatforms = adapterPlatforms.filter((p) => p !== "agentskills");
  const skillsSelected = adapterPlatforms.includes("agentskills");

  let config = `version: 1
sourceDir: .agentquilt/agents

# Agents without an explicit \`model:\` in agent.yaml inherit the platform's
# current model selection. Uncomment to give them a default tier instead:
# defaultModelTier: balanced

# Tiers are opt-in: reference one from agent.yaml (e.g. \`model: balanced\`)
modelTiers:
  balanced:
    claude: claude-sonnet-4-6
  frontier:
    claude: claude-opus-4-8
  fast:
    claude: claude-haiku-4-5-20251001

targets:
`;

  // Add agent target if any agent platforms selected
  if (agentPlatforms.length > 0) {
    config += `  - kind: agent-definitions
    agents: "*"
    platforms: [${agentPlatforms.map((p) => `${p}`).join(", ")}]
`;
    if (skillsSelected || presetPlatforms.length > 0) {
      config += "\n";
    }
  }

  // Skills authored under .agentquilt/skills/ compile to Agent Skills format
  if (skillsSelected) {
    config += `  - kind: agent-definitions
    sourceDir: skills  # resolved against the parent of sourceDir (.agentquilt/)
    agents: "*"
    platforms: [agentskills]
`;
    if (presetPlatforms.length > 0) {
      config += "\n";
    }
  }

  // Add preset-based targets for each preset platform. Adopted agents are
  // included right away; otherwise leave the list empty (build emits a
  // header-only document and warns until directories are listed).
  const presetInclude = adoptedAgents.length > 0
    ? `include: [${adoptedAgents.join(", ")}]`
    : "include: []  # list agent directories (under .agentquilt/agents/) to compile in";
  for (const preset of presetPlatforms) {
    config += `  - preset: ${preset}
    ${presetInclude}
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

// Frontmatter names come from files an attacker may have committed; the name
// becomes a directory under the adoption root, so it must stay inside that boundary.
function resolveAdoptionDir(rootDir: string, name: string): string | undefined {
  const boundary = resolve(rootDir);
  const target = resolve(rootDir, name);
  if (target === boundary || !target.startsWith(boundary + sep)) {
    console.warn(`  ${sym.warn} skipped ${JSON.stringify(name)}: name escapes the source directory`);
    return undefined;
  }
  return target;
}

const PLATFORM_SCAN: Record<string, { dir: string; glob: string }> = {
  claude: { dir: ".claude/agents", glob: "*.md" },
  agentskills: { dir: ".agents/skills", glob: "*/SKILL.md" },
};

export interface AdoptedSources {
  agents: string[];
  skills: string[];
}

export function adoptExistingAgents(
  cwd: string,
  platforms: string[],
  agentsDir: string,
  skillsDir: string
): AdoptedSources {
  const adopted: AdoptedSources = { agents: [], skills: [] };

  for (const platform of platforms) {
    const scan = PLATFORM_SCAN[platform];
    if (!scan) continue;

    const scanDir = join(cwd, scan.dir);
    if (!existsSync(scanDir)) continue;

    if (platform === "claude") {
      adopted.agents.push(...adoptClaudeAgents(scanDir, agentsDir));
    } else if (platform === "agentskills") {
      adopted.skills.push(...adoptAgentSkillsSkills(scanDir, skillsDir));
    }
  }

  return adopted;
}

function adoptClaudeAgents(scanDir: string, agentsDir: string): string[] {
  const adopted: string[] = [];
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

    const agentDir = resolveAdoptionDir(agentsDir, name);
    if (agentDir === undefined || existsSync(agentDir)) continue;

    const description = typeof fm["description"] === "string" && fm["description"].length > 0
      ? fm["description"]
      : `Adopted from .claude/agents/${entry.name}`;

    const modelTier = reverseMapModel(fm["model"]);
    const permissions = reverseMapPermissions(fm["tools"], fm["permissionMode"]);

    mkdirSync(agentDir, { recursive: true });
    writeAgentYaml(agentDir, description, modelTier, permissions);
    writeRoleBlock(agentDir, body);

    console.log(`  ${sym.ok} adopted ${name} ${dim(`from .claude/agents/${entry.name}`)}`);
    adopted.push(name);
  }

  return adopted;
}

function adoptAgentSkillsSkills(scanDir: string, skillsDir: string): string[] {
  const adopted: string[] = [];
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

    const sourceDir = resolveAdoptionDir(skillsDir, name);
    if (sourceDir === undefined || existsSync(sourceDir)) continue;

    const description = typeof fm["description"] === "string" && fm["description"].length > 0
      ? fm["description"]
      : `Adopted from .agents/skills/${skillDir.name}/SKILL.md`;

    mkdirSync(sourceDir, { recursive: true });
    writeSkillYaml(sourceDir, description);
    writeInstructionsBlock(sourceDir, body);

    console.log(`  ${sym.ok} adopted ${name} ${dim(`from .agents/skills/${skillDir.name}/SKILL.md`)}`);
    adopted.push(name);
  }

  return adopted;
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

function writeSkillYaml(skillDir: string, description: string): void {
  const yaml =
    `description: ${JSON.stringify(description)}\n` +
    `model: inherit  # skills carry no model of their own; the platform decides at runtime\n`;
  writeFileSync(join(skillDir, "agent.yaml"), yaml, "utf8");
}

export function splitBodyIntoSections(
  body: string,
  firstFilename = "010-role.md"
): Array<{ filename: string; content: string }> {
  const h1Regex = /^# .+/gm;
  const h1Matches = [...body.matchAll(h1Regex)];

  if (h1Matches.length <= 1) {
    const content = body.endsWith("\n") ? body : body + "\n";
    return [{ filename: firstFilename, content }];
  }

  const result: Array<{ filename: string; content: string }> = [];

  for (let i = 0; i < h1Matches.length; i++) {
    const matchStart = h1Matches[i].index!;
    const nextMatchStart =
      i + 1 < h1Matches.length ? h1Matches[i + 1].index! : body.length;

    let sectionContent = body.slice(matchStart, nextMatchStart).trimEnd() + "\n";

    // Prepend any preamble (content before first H1) into the first section
    if (i === 0 && matchStart > 0) {
      sectionContent = body.slice(0, matchStart) + sectionContent;
    }

    let filename: string;
    if (i === 0) {
      filename = firstFilename;
    } else {
      const num = String((i + 1) * 10).padStart(3, "0");
      const headingText = h1Matches[i][0].slice(2).trim();
      const slug =
        headingText
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || `section-${i + 1}`;
      filename = `${num}-${slug}.md`;
    }

    result.push({ filename, content: sectionContent });
  }

  return result;
}

function writeRoleBlock(agentDir: string, body: string): void {
  for (const { filename, content } of splitBodyIntoSections(body, "010-role.md")) {
    writeFileSync(join(agentDir, filename), content, "utf8");
  }
}

function writeInstructionsBlock(skillDir: string, body: string): void {
  for (const { filename, content } of splitBodyIntoSections(body, "010-instructions.md")) {
    writeFileSync(join(skillDir, filename), content, "utf8");
  }
}
