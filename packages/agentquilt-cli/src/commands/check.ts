import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { findConfigFile, loadConfig, validateConfig, ConfigError } from "../core/configLoader.js";
import { compile } from "../core/compiler.js";
import { compileAgentDefinitionsTarget } from "../core/agentCompiler.js";
import { createLock, readLock, diffLock } from "../core/lockWriter.js";

interface CheckOptions {
  config?: string;
  cwd: string;
  quiet?: boolean;
}

export class DriftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriftError";
  }
}

export function registerCheckCommand(program: Command): void {
  program
    .command("check")
    .description("Check that outputs and lock match current source (CI gate)")
    .option("--config <path>", "path to config file")
    .option("--cwd <dir>", "working directory", process.cwd())
    .option("--quiet", "suppress output")
    .action(checkAction);
}

async function checkAction(options: CheckOptions): Promise<void> {
  try {
    const cwd = options.cwd || process.cwd();

    // Find and load config
    const configPath = options.config || findConfigFile(cwd);
    const config = loadConfig(configPath);
    const sourceDir = path.join(cwd, config.sourceDir);

    // Validate config
    validateConfig(config, sourceDir);

    // Compile document targets (in-memory)
    const result = await compile(config, sourceDir);
    const allFragmentMap = new Map(result.fragmentMap);
    let agentRecords: any[] = [];

    // Compile agent-definitions targets
    for (const target of config.targets) {
      if (target.kind !== "agent-definitions") continue;

      const agentResult = await compileAgentDefinitionsTarget(target, config, sourceDir, cwd);
      agentRecords.push(...agentResult.agentRecords);

      // Merge fragment maps
      for (const [id, meta] of agentResult.fragmentMap) {
        allFragmentMap.set(id, meta);
      }
    }

    const newLock = createLock(allFragmentMap, result.targets, agentRecords);

    let hasDrift = false;

    // Check each compiled target against disk
    for (const target of result.targets) {
      const outputPath = path.join(cwd, target.output);

      if (!existsSync(outputPath)) {
        if (!options.quiet) {
          console.error(`✗ ${target.output}: file does not exist`);
        }
        hasDrift = true;
        continue;
      }

      const diskContent = readFileSync(outputPath, "utf8");
      if (diskContent !== target.content) {
        if (!options.quiet) {
          console.error(`✗ ${target.output}: content differs`);
          console.error(
            `  Expected version: ${target.version}`
          );
          // Try to extract version from disk for comparison
          const versionMatch = diskContent.match(/version=([a-f0-9-]+)/);
          if (versionMatch) {
            console.error(`  Disk version:     ${versionMatch[1]}`);
          }
          console.error(`  Regenerate with: npx agentquilt build`);
        }
        hasDrift = true;
      } else if (!options.quiet) {
        console.log(`✓ ${target.output} matches`);
      }
    }

    // Check lock
    const lockPath = path.join(cwd, "agentquilt.lock");
    const diskLock = readLock(lockPath);

    if (!diskLock) {
      if (!options.quiet) {
        console.error(`✗ agentquilt.lock: file does not exist`);
        console.error(`  Regenerate with: npx agentquilt build`);
      }
      hasDrift = true;
    } else {
      const diff = diffLock(diskLock, newLock);
      if (diff.changed) {
        if (!options.quiet) {
          console.error(`✗ agentquilt.lock: content differs`);
          if (diff.fragmentChanges.added.length > 0) {
            console.error(`  Added fragments: ${diff.fragmentChanges.added.join(", ")}`);
          }
          if (diff.fragmentChanges.removed.length > 0) {
            console.error(`  Removed fragments: ${diff.fragmentChanges.removed.join(", ")}`);
          }
          if (diff.fragmentChanges.modified.length > 0) {
            console.error(`  Modified fragments: ${diff.fragmentChanges.modified.join(", ")}`);
          }
          if (diff.targetChanges.added.length > 0) {
            console.error(`  Added targets: ${diff.targetChanges.added.join(", ")}`);
          }
          if (diff.targetChanges.removed.length > 0) {
            console.error(`  Removed targets: ${diff.targetChanges.removed.join(", ")}`);
          }
          if (diff.targetChanges.modified.length > 0) {
            console.error(`  Modified targets: ${diff.targetChanges.modified.join(", ")}`);
          }
          if (diff.agentChanges.added.length > 0) {
            console.error(`  Added agents: ${diff.agentChanges.added.join(", ")}`);
          }
          if (diff.agentChanges.removed.length > 0) {
            console.error(`  Removed agents: ${diff.agentChanges.removed.join(", ")}`);
          }
          if (diff.agentChanges.modified.length > 0) {
            console.error(`  Modified agents: ${diff.agentChanges.modified.join(", ")}`);
          }
          console.error(`  Regenerate with: npx agentquilt build`);
        }
        hasDrift = true;
      } else if (!options.quiet) {
        console.log(`✓ agentquilt.lock matches`);
      }
    }

    if (!options.quiet && !hasDrift) {
      console.log(`All targets up to date.`);
    }

    process.exit(hasDrift ? 1 : 0);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`✗ ${err.message}`);
      process.exit(2);
    }

    if (err instanceof Error) {
      console.error(`✗ Error: ${err.message}`);
      if ((err as any).code === "ENOENT" || (err as any).code === "EACCES") {
        process.exit(3);
      }
      process.exit(2);
    }

    console.error(`✗ Unknown error`);
    process.exit(3);
  }
}
