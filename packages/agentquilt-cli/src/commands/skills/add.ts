import { Command } from "commander";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { resolveSkillsDir } from "./skillsDir.js";
import { cyan, dim, green, sym } from "../../ui/terminal.js";

interface AddSkillOptions {
  cwd: string;
}

export function registerAddSkillCommand(program: Command): void {
  program
    .command("add <name>")
    .description("Scaffold a new skill definition")
    .option("--cwd <dir>", "working directory", process.cwd())
    .action((name, options) => addSkillAction(name, options));
}

export function addSkillAction(name: string, options: AddSkillOptions): void {
  try {
    const cwd = options.cwd || process.cwd();
    const skillsDir = resolveSkillsDir(cwd);
    const skillDir = path.join(cwd, skillsDir, name);

    // Security: reject names that escape the skills directory via path traversal
    const absoluteSkillsDir = path.resolve(cwd, skillsDir);
    const absoluteSkillDir = path.resolve(absoluteSkillsDir, name);
    if (!absoluteSkillDir.startsWith(absoluteSkillsDir + path.sep)) {
      console.error(`${sym.fail} Invalid skill name: "${name}" (must not contain path separators or traversal sequences)`);
      process.exit(2);
    }

    // Check if skill already exists
    if (existsSync(path.join(skillDir, "agent.yaml"))) {
      console.error(`${sym.fail} Skill already exists: ${skillDir}/agent.yaml`);
      process.exit(2);
    }

    // Create directories
    mkdirSync(skillDir, { recursive: true });

    // Create agent.yaml (skills use the same manifest format as agents)
    const manifestYaml = `description: "TODO: describe what this skill does and when the agent should use it."
model: inherit  # skills carry no model of their own; the platform decides at runtime
`;
    writeFileSync(path.join(skillDir, "agent.yaml"), manifestYaml, "utf8");
    console.log(`${sym.ok} created ${skillsDir}/${name}/agent.yaml`);

    // Create 010-instructions.md
    const instructionsContent =
      "TODO: write the step-by-step instructions the agent follows when this skill is invoked.\n";
    writeFileSync(path.join(skillDir, "010-instructions.md"), instructionsContent, "utf8");
    console.log(`${sym.ok} created ${skillsDir}/${name}/010-instructions.md`);

    console.log(`\n${green(`✓ Skill '${name}' scaffolded successfully`)}\n`);
    console.log("Next steps:");
    console.log(`  ${dim("1.")} Edit ${skillsDir}/${name}/agent.yaml — the description is the skill's trigger`);
    console.log(`  ${dim("2.")} Edit ${skillsDir}/${name}/010-instructions.md (and add more fragments)`);
    console.log(`  ${dim("3.")} Ensure .agentquilt/config.yaml has a skills target, then run: ${cyan("agentquilt build")}`);
    console.log(dim("       - kind: agent-definitions"));
    console.log(dim("         sourceDir: skills"));
    console.log(dim('         agents: "*"'));
    console.log(dim("         platforms: [agentskills]"));

    process.exit(0);
  } catch (err) {
    console.error(
      `${sym.fail} Failed to add skill: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(3);
  }
}
