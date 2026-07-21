import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { findConfigFile, loadConfig, validateConfig, ConfigError } from "../core/configLoader.js";
import { compile } from "../core/compiler.js";
import {
  compileAgentDefinitionsTarget,
  mergeCompiledAgentTargets,
  type AdapterOutput,
  type CompiledAgentTarget,
} from "../core/agentCompiler.js";
import { createLock, readLock, diffLock } from "../core/lockWriter.js";
import { cyan, dim, green, sym, formatDuration, createSpinner } from "../ui/terminal.js";
import { validateOutputPaths, type OutputPathClaim } from "../core/pathSecurity.js";

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
    const startedAt = performance.now();

    // Compile everything in memory before any output, so the spinner never
    // interleaves with result lines.
    const spinner = createSpinner("Checking for drift…");
    if (!options.quiet) spinner.start();

    let result: Awaited<ReturnType<typeof compile>>;
    const allFragmentMap = new Map<string, any>();
    let agentRecords: any[] = [];
    const agentOutputs: AdapterOutput[] = [];
    const agentResults: CompiledAgentTarget[] = [];

    try {
      // Find and load config
      const configPath = options.config || findConfigFile(cwd);
      const config = loadConfig(configPath);
      const sourceDir = path.join(cwd, config.sourceDir);

      // Validate config
      validateConfig(config, sourceDir, cwd);

      // Compile document targets (in-memory)
      result = await compile(config, sourceDir);
      for (const [id, meta] of result.fragmentMap) {
        allFragmentMap.set(id, meta);
      }

      // Compile agent-definitions targets
      for (const target of config.targets) {
        if (target.kind !== "agent-definitions") continue;

        const agentResult = await compileAgentDefinitionsTarget(target, config, sourceDir, cwd);
        agentResults.push(agentResult);
      }
      const merged = mergeCompiledAgentTargets(agentResults);
      agentRecords = merged.agentRecords;
      for (const outputs of merged.outputs.values()) {
        agentOutputs.push(...outputs);
      }
      for (const [id, meta] of merged.fragmentMap) {
        allFragmentMap.set(id, meta);
      }
      const lockOutput = ["agentquilt", "lock"].join(".");
      const claims: OutputPathClaim[] = [
        ...result.targets.map((target) => ({
          path: target.output,
          owner: `document target ${target.output}`,
        })),
        ...agentOutputs.map((output) => ({
          path: output.path,
          owner: `adapter output ${output.path}`,
        })),
        { path: lockOutput, owner: "AgentQuilt lock" },
      ];
      validateOutputPaths(cwd, claims);
    } finally {
      spinner.stop();
    }

    const newLock = createLock(allFragmentMap, result.targets, agentRecords);

    let hasDrift = false;

    // Check each compiled target against disk
    for (const target of result.targets) {
      const outputPath = path.resolve(cwd, target.output);

      if (!existsSync(outputPath)) {
        if (!options.quiet) {
          console.error(`${sym.fail} ${target.output}: file does not exist`);
        }
        hasDrift = true;
        continue;
      }

      const diskContent = readFileSync(outputPath, "utf8");
      if (diskContent !== target.content) {
        if (!options.quiet) {
          console.error(`${sym.fail} ${target.output}: content differs`);
          console.error(
            dim(`  Expected version: ${target.version}`)
          );
          // Try to extract version from disk for comparison
          const versionMatch = diskContent.match(/version=([a-f0-9-]+)/);
          if (versionMatch) {
            console.error(dim(`  Disk version:     ${versionMatch[1]}`));
          }
          console.error(`  Regenerate with: ${cyan("agentquilt build")}`);
        }
        hasDrift = true;
      } else if (!options.quiet) {
        console.log(`${sym.ok} ${target.output} ${dim("matches")}`);
      }
    }

    // Check agent-definitions outputs against disk. Build writes each adapter
    // output verbatim to path.join(cwd, output.path), so compare the same
    // way. Every adapter output is a standalone file (ADR-0015 rejected
    // managed-region injection into shared, user-owned config files), so no
    // output kind is ever skipped here.
    for (const output of agentOutputs) {
      const outputPath = path.resolve(cwd, output.path);

      if (!existsSync(outputPath)) {
        if (!options.quiet) {
          console.error(`${sym.fail} ${output.path}: file does not exist`);
          console.error(`  Regenerate with: ${cyan("agentquilt build")}`);
        }
        hasDrift = true;
        continue;
      }

      const diskContent = readFileSync(outputPath, "utf8");
      if (diskContent !== output.content) {
        if (!options.quiet) {
          console.error(`${sym.fail} ${output.path}: content differs`);
          console.error(`  Regenerate with: ${cyan("agentquilt build")}`);
        }
        hasDrift = true;
      } else if (!options.quiet) {
        console.log(`${sym.ok} ${output.path} ${dim("matches")}`);
      }
    }

    // Check lock
    const lockPath = path.join(cwd, "agentquilt.lock");
    const diskLock = readLock(lockPath);

    if (!diskLock) {
      if (!options.quiet) {
        console.error(`${sym.fail} agentquilt.lock: file does not exist`);
        console.error(`  Regenerate with: ${cyan("agentquilt build")}`);
      }
      hasDrift = true;
    } else {
      const diff = diffLock(diskLock, newLock);
      if (diff.changed) {
        if (!options.quiet) {
          console.error(`${sym.fail} agentquilt.lock: content differs`);
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
          console.error(`  Regenerate with: ${cyan("agentquilt build")}`);
        }
        hasDrift = true;
      } else if (!options.quiet) {
        console.log(`${sym.ok} agentquilt.lock ${dim("matches")}`);
      }
    }

    if (!options.quiet && !hasDrift) {
      console.log(
        `${green("All targets up to date.")} ${dim(`(checked in ${formatDuration(performance.now() - startedAt)})`)}`
      );
    }

    process.exit(hasDrift ? 1 : 0);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`${sym.fail} ${err.message}`);
      process.exit(2);
    }

    if (err instanceof Error) {
      console.error(`${sym.fail} Error: ${err.message}`);
      if ((err as any).code === "ENOENT" || (err as any).code === "EACCES") {
        process.exit(3);
      }
      process.exit(2);
    }

    console.error(`${sym.fail} Unknown error`);
    process.exit(3);
  }
}
