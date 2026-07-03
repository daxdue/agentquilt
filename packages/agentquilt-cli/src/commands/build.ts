import { Command } from "commander";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { findConfigFile, loadConfig, validateConfig, ConfigError } from "../core/configLoader.js";
import { compile } from "../core/compiler.js";
import { compileAgentDefinitionsTarget } from "../core/agentCompiler.js";
import { createLock, writeLock } from "../core/lockWriter.js";

interface BuildOptions {
  config?: string;
  cwd: string;
  quiet?: boolean;
}

export function registerBuildCommand(program: Command): void {
  program
    .command("build")
    .description("Compile all targets and write outputs + lock")
    .option("--config <path>", "path to config file")
    .option("--cwd <dir>", "working directory", process.cwd())
    .option("--quiet", "suppress output")
    .action(buildAction);
}

async function buildAction(options: BuildOptions): Promise<void> {
  try {
    const cwd = options.cwd || process.cwd();

    // Find and load config
    const configPath = options.config || findConfigFile(cwd);
    const config = loadConfig(configPath);
    const sourceDir = path.join(cwd, config.sourceDir);

    // Validate config
    validateConfig(config, sourceDir);

    // Compile document targets
    const result = await compile(config, sourceDir);

    // Write document outputs
    for (const target of result.targets) {
      const outputPath = path.join(cwd, target.output);
      const outputDir = path.dirname(outputPath);

      // Create parent directories if needed
      mkdirSync(outputDir, { recursive: true });

      // Write output file
      writeFileSync(outputPath, target.content, "utf8");

      if (!options.quiet) {
        console.log(
          `✓ built ${target.output} (${target.fragmentIds.length} fragments, version ${target.version.substring(0, 12)}...)`
        );
      }
    }

    // Compile agent-definitions targets
    let agentRecords: any[] = [];
    const allFragmentMap = new Map(result.fragmentMap);

    for (const target of config.targets) {
      if (target.kind !== "agent-definitions") continue;

      const agentResult = await compileAgentDefinitionsTarget(target, config, sourceDir, cwd);
      agentRecords.push(...agentResult.agentRecords);

      // Merge fragment maps
      for (const [id, meta] of agentResult.fragmentMap) {
        allFragmentMap.set(id, meta);
      }

      // Write adapter outputs (none in Phase 2)
      for (const outputs of agentResult.outputs.values()) {
        for (const output of outputs) {
          const outputPath = path.join(cwd, output.path);
          mkdirSync(path.dirname(outputPath), { recursive: true });
          writeFileSync(outputPath, output.content, "utf8");
          if (!options.quiet) {
            console.log(`✓ wrote ${output.path}`);
          }
        }
      }
    }

    // Create and write lock (with agents)
    const lock = createLock(allFragmentMap, result.targets, agentRecords);
    const lockPath = path.join(cwd, "agentquilt.lock");
    writeLock(lock, lockPath);

    if (!options.quiet) {
      console.log(
        `✓ lock written (${result.targets.length} targets, ${lock.fragments.length} fragments, ${lock.agents.length} agents)`
      );
    }

    process.exit(0);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`✗ ${err.message}`);
      process.exit(2);
    }

    if (err instanceof Error) {
      // I/O errors or other runtime errors
      console.error(`✗ Error: ${err.message}`);
      if ((err as any).code === "ENOENT" || (err as any).code === "EACCES") {
        process.exit(3); // I/O error
      }
      process.exit(2); // Generic error
    }

    console.error(`✗ Unknown error`);
    process.exit(3);
  }
}
