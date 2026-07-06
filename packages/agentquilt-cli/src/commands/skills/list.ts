import { Command } from "commander";
import path from "path";
import { ConfigError } from "../../core/configLoader.js";
import { discoverAgentDirs, loadAgentDir } from "../../core/agentLoader.js";
import { resolveSkillsDir } from "./skillsDir.js";
import { bold, dim, sym } from "../../ui/terminal.js";

interface ListSkillsOptions {
  config?: string;
  cwd: string;
}

export function registerSkillsListCommand(program: Command): void {
  program
    .command("list")
    .description("List skills and their descriptions")
    .option("--config <path>", "path to config file")
    .option("--cwd <dir>", "working directory", process.cwd())
    .action((options) => listSkillsAction(options));
}

function listSkillsAction(options: ListSkillsOptions): void {
  try {
    const cwd = options.cwd || process.cwd();
    const skillsRoot = path.join(cwd, resolveSkillsDir(cwd, options.config));

    const skillDirs = discoverAgentDirs(skillsRoot);
    if (skillDirs.length === 0) {
      console.log("No skills found.");
      process.exit(0);
    }

    const rows = skillDirs.map((dir) => {
      const record = loadAgentDir(dir, cwd);
      return { skill: record.name, description: record.definition.description };
    });

    console.log("");
    console.log(bold("Skills:"));
    console.log("");

    const skillWidth = Math.max(5, ...rows.map((r) => r.skill.length));
    console.log(dim("skill" + " ".repeat(skillWidth - 5) + "  description"));
    console.log(dim("─".repeat(skillWidth + 13)));

    for (const row of rows) {
      const description =
        row.description.length > 72 ? row.description.slice(0, 69) + "..." : row.description;
      console.log(row.skill.padEnd(skillWidth) + "  " + description);
    }
    console.log("");

    process.exit(0);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`${sym.fail} ${err.message}`);
      process.exit(2);
    }
    console.error(
      `${sym.fail} Error: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(3);
  }
}
