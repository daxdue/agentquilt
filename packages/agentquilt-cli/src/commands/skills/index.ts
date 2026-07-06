import { Command } from "commander";
import { registerAddSkillCommand } from "./add.js";
import { registerSkillsListCommand } from "./list.js";

export function registerSkillsCommand(program: Command): void {
  const skillsCmd = program.command("skills").description("Manage skill definitions");
  registerAddSkillCommand(skillsCmd);
  registerSkillsListCommand(skillsCmd);
}
