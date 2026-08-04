import { Command } from "commander";
import { registerAddAgentCommand } from "./add.js";
import { registerAgentsListCommand } from "./list.js";

export function registerAgentsCommand(program: Command): void {
  const agentsCmd = program.command("agents").description("Manage agent definitions");
  registerAddAgentCommand(agentsCmd);
  registerAgentsListCommand(agentsCmd);
}
