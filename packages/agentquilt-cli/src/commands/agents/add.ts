import { Command } from "commander";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { findConfigFile, loadConfig, ConfigError } from "../../core/configLoader.js";
import { cyan, dim, green, sym } from "../../ui/terminal.js";

interface AddAgentOptions {
  cwd: string;
}

const DEFAULT_SOURCE_DIR = ".agentquilt/agents";

/** Resolve the configured sourceDir; fall back to the default when no config exists yet. */
function resolveSourceDir(cwd: string): string {
  try {
    const config = loadConfig(findConfigFile(cwd));
    return config.sourceDir;
  } catch (err) {
    if (err instanceof ConfigError) {
      return DEFAULT_SOURCE_DIR;
    }
    throw err;
  }
}

export function registerAddAgentCommand(program: Command): void {
  program
    .command("add <name>")
    .description("Scaffold a new agent definition")
    .option("--cwd <dir>", "working directory", process.cwd())
    .action((name, options) => addAgentAction(name, options));
}

export function addAgentAction(name: string, options: AddAgentOptions): void {
  try {
    const cwd = options.cwd || process.cwd();
    const sourceDir = resolveSourceDir(cwd);
    const agentDir = path.join(cwd, sourceDir, name);

    // Security: reject names that escape the source directory via path traversal
    const absoluteSourceDir = path.resolve(cwd, sourceDir);
    const absoluteAgentDir = path.resolve(absoluteSourceDir, name);
    if (!absoluteAgentDir.startsWith(absoluteSourceDir + path.sep)) {
      console.error(`${sym.fail} Invalid agent name: "${name}" (must not contain path separators or traversal sequences)`);
      process.exit(2);
    }

    // Check if agent already exists
    if (existsSync(path.join(agentDir, "agent.yaml"))) {
      console.error(`${sym.fail} Agent already exists: ${agentDir}/agent.yaml`);
      process.exit(2);
    }

    // Create directories
    mkdirSync(agentDir, { recursive: true });

    // Create agent.yaml
    const agentYaml = `description: "TODO: describe what this agent does and when to use it."
# model: balanced  # optional tier (see modelTiers in config); omit to inherit the platform's current model
permissions: read-only
`;
    writeFileSync(path.join(agentDir, "agent.yaml"), agentYaml, "utf8");
    console.log(`${sym.ok} created ${sourceDir}/${name}/agent.yaml`);

    // Create 010-role.md
    const roleContent = "You are a helpful assistant.\n";
    writeFileSync(path.join(agentDir, "010-role.md"), roleContent, "utf8");
    console.log(`${sym.ok} created ${sourceDir}/${name}/010-role.md`);

    console.log(`\n${green(`✓ Agent '${name}' scaffolded successfully`)}\n`);
    console.log("Next steps:");
    console.log(`  ${dim("1.")} Edit ${sourceDir}/${name}/agent.yaml to customize the agent`);
    console.log(`  ${dim("2.")} Edit ${sourceDir}/${name}/010-role.md (and add more fragments)`);
    console.log(`  ${dim("3.")} Add the agent to a target in .agentquilt/config.yaml, then run: ${cyan("agentquilt build")}`);

    process.exit(0);
  } catch (err) {
    console.error(
      `${sym.fail} Failed to add agent: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(3);
  }
}
