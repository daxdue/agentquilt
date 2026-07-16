#!/usr/bin/env node

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { program } from "commander";
import { registerInitCommand } from "./commands/init.js";
import { registerBuildCommand } from "./commands/build.js";
import { registerCheckCommand } from "./commands/check.js";
import { registerAgentsCommand } from "./commands/agents/index.js";
import { registerSkillsCommand } from "./commands/skills/index.js";
import "./core/adapters/claude.js";
import "./core/adapters/agentskills.js";

// Read from package.json at runtime rather than hardcoding, so --version
// can't drift from the published package version the way it silently did
// through 0.1.0/0.1.1 (dist/ and package.json are always siblings, both in
// this repo and in a real npm install).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, "..", "package.json");
const { version } = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  version: string;
};

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
