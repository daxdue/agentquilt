import { Command } from "commander";
import {
  ConfigError,
  findConfigFile,
  loadConfig,
  validateConfig,
} from "../../core/configLoader.js";
import { discoverAgentDirs, loadAgentDir } from "../../core/agentLoader.js";
import { resolveModel } from "../../core/modelResolver.js";
import path from "path";
import { bold, dim, red, sym } from "../../ui/terminal.js";

interface ListAgentsOptions {
  config?: string;
  cwd: string;
}

export function registerAgentsListCommand(program: Command): void {
  program
    .command("list")
    .description("List agents and resolved models per platform")
    .option("--config <path>", "path to config file")
    .option("--cwd <dir>", "working directory", process.cwd())
    .action((options) => listAgentsAction(options));
}

function listAgentsAction(options: ListAgentsOptions): void {
  try {
    const cwd = options.cwd || process.cwd();
    const configPath = options.config || findConfigFile(cwd);
    const config = loadConfig(configPath);
    const sourceDir = path.join(cwd, config.sourceDir);

    validateConfig(config, sourceDir);

    // Discover all agents
    const agentDirs = discoverAgentDirs(sourceDir);
    if (agentDirs.length === 0) {
      console.log("No agents found.");
      process.exit(0);
    }

    // Load and resolve models
    let hasErrors = false;
    const rows: { agent: string; platform: string; model: string }[] = [];

    for (const agentDir of agentDirs) {
      const record = loadAgentDir(agentDir, cwd);

      // Platforms come only from targets that actually include this agent.
      // Targets with a sourceDir override compile a different source root
      // than the global sourceDir scanned here, so they never apply.
      const platforms = new Set<string>();
      for (const target of config.targets) {
        if (target.kind !== "agent-definitions" || target.sourceDir) continue;
        const included =
          target.agents === "*" ||
          (Array.isArray(target.agents) && target.agents.includes(record.name));
        if (!included) continue;
        for (const plat of target.platforms) {
          platforms.add(plat);
        }
      }

      if (platforms.size === 0) {
        console.warn(`Warning: ${record.name} is not included in any agent-definitions target`);
        continue;
      }

      for (const platform of platforms) {
        try {
          const resolved = resolveModel(record.definition, platform, config);
          const model = resolved.model ?? "(inherit)";
          rows.push({ agent: record.name, platform, model });
        } catch (err) {
          rows.push({
            agent: record.name,
            platform,
            model: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
          });
          hasErrors = true;
        }
      }
    }

    // Print table
    if (rows.length > 0) {
      console.log("");
      console.log(bold("Agents:"));
      console.log("");

      const agentWidth = Math.max(5, ...rows.map((r) => r.agent.length));
      const platformWidth = Math.max(8, ...rows.map((r) => r.platform.length));

      console.log(
        dim(
          "agent" + " ".repeat(agentWidth - 5) + "  " +
          "platform" + " ".repeat(platformWidth - 8) + "  " +
          "model"
        )
      );
      console.log(dim("─".repeat(agentWidth + platformWidth + 6)));

      for (const row of rows) {
        const model = row.model.startsWith("ERROR:")
          ? red(row.model)
          : row.model === "(inherit)"
            ? dim(row.model)
            : row.model;
        console.log(
          row.agent.padEnd(agentWidth) + "  " +
          dim(row.platform.padEnd(platformWidth)) + "  " +
          model
        );
      }
      console.log("");
    }

    process.exit(hasErrors ? 1 : 0);
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
