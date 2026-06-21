#!/usr/bin/env node

import { program } from "commander";
import { registerCompileCommand } from "./commands/compile.js";

const version = "0.1.0";

program
  .name("agentctl")
  .description("CLI tool for AgentQuilt agent framework")
  .version(version);

registerCompileCommand(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
