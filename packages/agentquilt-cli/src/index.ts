#!/usr/bin/env node

import { program } from "commander";
import { registerInitCommand } from "./commands/init.js";
import { registerBuildCommand } from "./commands/build.js";
import { registerCheckCommand } from "./commands/check.js";
import { registerAgentsCommand } from "./commands/agents/index.js";
import { registerSkillsCommand } from "./commands/skills/index.js";
import "./core/adapters/claude.js";
import "./core/adapters/agentskills.js";

const version = "0.1.0";

program
  .name("agentquilt")
  .description("Deterministic compiler for AI agent instruction files")
  .version(version);

registerInitCommand(program);
registerBuildCommand(program);
registerCheckCommand(program);
registerAgentsCommand(program);
registerSkillsCommand(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
