import { Command } from "commander";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { findConfigFile, loadConfig, validateConfig, ConfigError } from "../core/configLoader.js";
import { compile } from "../core/compiler.js";
import { compileAgentDefinitionsTarget } from "../core/agentCompiler.js";
import { createLock, writeLock } from "../core/lockWriter.js";
import { watchTree, watchFile, WatchHandle } from "../core/watcher.js";
import type { AgentQuiltConfig } from "../schemas/config.schema.js";
import { bold, cyan, dim, sym, formatDuration, createSpinner } from "../ui/terminal.js";

interface BuildOptions {
  config?: string;
  cwd: string;
  quiet?: boolean;
  watch?: boolean;
}

const WATCH_DEBOUNCE_MS = 150;
const WATCHED_EXTENSIONS = new Set([".md", ".yaml", ".yml", ".json"]);

export function registerBuildCommand(program: Command): void {
  program
    .command("build")
    .description("Compile all targets and write outputs + lock")
    .option("--config <path>", "path to config file")
    .option("--cwd <dir>", "working directory", process.cwd())
    .option("--quiet", "suppress output")
    .option("--watch", "rebuild when source fragments or config change")
    .action(buildAction);
}

interface BuildResult {
  config: AgentQuiltConfig;
  configPath: string;
  /** Absolute paths of every file the build wrote (outputs + lock). */
  writtenPaths: Set<string>;
}

async function executeBuild(options: BuildOptions): Promise<BuildResult> {
  const cwd = options.cwd || process.cwd();
  const writtenPaths = new Set<string>();
  const startedAt = performance.now();

  // Phase 1: compile everything in memory. The spinner runs only here, so it
  // never interleaves with the result lines printed in phase 2.
  const spinner = createSpinner("Loading config…");
  if (!options.quiet) spinner.start();

  let config: AgentQuiltConfig;
  let configPath: string;
  let result: Awaited<ReturnType<typeof compile>>;
  const agentResults: Awaited<ReturnType<typeof compileAgentDefinitionsTarget>>[] = [];

  try {
    configPath = options.config || findConfigFile(cwd);
    config = loadConfig(configPath);
    const sourceDir = path.join(cwd, config.sourceDir);
    validateConfig(config, sourceDir);

    spinner.update("Compiling fragments…");
    result = await compile(config, sourceDir);

    spinner.update("Compiling agents…");
    for (const target of config.targets) {
      if (target.kind !== "agent-definitions") continue;
      agentResults.push(await compileAgentDefinitionsTarget(target, config, sourceDir, cwd));
    }
  } finally {
    spinner.stop();
  }

  // Phase 2: write outputs and report.
  for (const target of result.targets) {
    const outputPath = path.join(cwd, target.output);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, target.content, "utf8");
    writtenPaths.add(outputPath);

    if (!options.quiet) {
      console.log(
        `${sym.ok} built ${bold(target.output)} ${dim(`(${target.fragmentIds.length} fragments, version ${target.version.substring(0, 12)}…)`)}`
      );
      if (target.fragmentIds.length === 0) {
        console.warn(
          `  ${sym.warn} ${target.output} is empty — list agent directories under the target's include: in .agentquilt/config.yaml`
        );
      }
    }
  }

  let agentRecords: any[] = [];
  const allFragmentMap = new Map(result.fragmentMap);

  for (const agentResult of agentResults) {
    agentRecords.push(...agentResult.agentRecords);

    // Merge fragment maps
    for (const [id, meta] of agentResult.fragmentMap) {
      allFragmentMap.set(id, meta);
    }

    // Write adapter outputs
    for (const outputs of agentResult.outputs.values()) {
      for (const output of outputs) {
        const outputPath = path.join(cwd, output.path);
        mkdirSync(path.dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, output.content, "utf8");
        writtenPaths.add(outputPath);
        if (!options.quiet) {
          console.log(`${sym.ok} wrote ${output.path}`);
        }
      }
    }
  }

  // Create and write lock (with agents)
  const lock = createLock(allFragmentMap, result.targets, agentRecords);
  const lockPath = path.join(cwd, "agentquilt.lock");
  writeLock(lock, lockPath);
  writtenPaths.add(lockPath);

  if (!options.quiet) {
    console.log(
      `${sym.ok} lock written ${dim(`(${result.targets.length} targets, ${lock.fragments.length} fragments, ${lock.agents.length} agents)`)}`
    );
    console.log(dim(`Done in ${formatDuration(performance.now() - startedAt)}`));
  }

  return { config, configPath, writtenPaths };
}

function reportError(err: unknown): number {
  if (err instanceof ConfigError) {
    console.error(`${sym.fail} ${err.message}`);
    return 2;
  }

  if (err instanceof Error) {
    // I/O errors or other runtime errors
    console.error(`${sym.fail} Error: ${err.message}`);
    if ((err as any).code === "ENOENT" || (err as any).code === "EACCES") {
      return 3; // I/O error
    }
    return 2; // Generic error
  }

  console.error(`${sym.fail} Unknown error`);
  return 3;
}

async function buildAction(options: BuildOptions): Promise<void> {
  if (options.watch) {
    return watchAction(options);
  }

  try {
    await executeBuild(options);
    process.exit(0);
  } catch (err) {
    process.exit(reportError(err));
  }
}

/**
 * Watch roots: the global sourceDir plus any per-target sourceDir overrides
 * (resolved against the parent of the global sourceDir), deduplicated by
 * containment. The config file gets its own single-file watcher so a legacy
 * root-level config never forces watching the whole repository.
 */
function resolveWatchRoots(config: AgentQuiltConfig, cwd: string): string[] {
  const sourceDir = path.join(cwd, config.sourceDir);
  const roots = new Set<string>([sourceDir]);

  for (const target of config.targets) {
    if (target.kind === "agent-definitions" && target.sourceDir) {
      roots.add(path.resolve(sourceDir, "..", target.sourceDir));
    }
  }

  return [...roots].filter(
    (root) =>
      ![...roots].some((other) => other !== root && root.startsWith(other + path.sep))
  );
}

async function watchAction(options: BuildOptions): Promise<void> {
  const cwd = options.cwd || process.cwd();

  // The initial build must at least discover a config — without one there is
  // nothing to watch. Later failures (broken YAML mid-edit, validation
  // errors) are reported and watching continues.
  let configPath: string;
  let config: AgentQuiltConfig;
  try {
    configPath = options.config || findConfigFile(cwd);
    config = loadConfig(configPath);
  } catch (err) {
    process.exit(reportError(err));
  }

  let writtenPaths = new Set<string>();
  const runBuild = async (): Promise<void> => {
    try {
      const result = await executeBuild(options);
      config = result.config;
      writtenPaths = result.writtenPaths;
      if (!options.quiet) {
        console.log(dim(`  watching for changes… (ctrl-c to stop)`));
      }
    } catch (err) {
      reportError(err);
      if (!options.quiet) {
        console.log(dim(`  watching for changes… (ctrl-c to stop)`));
      }
    }
  };

  await runBuild();

  let timer: NodeJS.Timeout | undefined;
  let building = false;
  let dirty = false;

  const scheduleRebuild = (changedPath: string): void => {
    // Skip our own outputs (relevant only if an output lives inside a watch
    // root) and editor noise like swap/temp files.
    if (writtenPaths.has(changedPath)) return;
    const ext = path.extname(changedPath).toLowerCase();
    if (ext && !WATCHED_EXTENSIONS.has(ext)) return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      if (building) {
        dirty = true;
        return;
      }
      building = true;
      if (!options.quiet) {
        const time = new Date().toLocaleTimeString("en-GB");
        console.log(
          `\n${sym.arrow} ${dim(time)} change detected: ${cyan(path.relative(cwd, changedPath))}`
        );
      }
      do {
        dirty = false;
        await runBuild();
      } while (dirty);
      building = false;
    }, WATCH_DEBOUNCE_MS);
  };

  const handles: WatchHandle[] = [];
  for (const root of resolveWatchRoots(config, cwd)) {
    handles.push(watchTree(root, scheduleRebuild));
  }
  handles.push(watchFile(configPath, () => scheduleRebuild(configPath)));

  process.on("SIGINT", () => {
    for (const handle of handles) handle.close();
    process.exit(0);
  });

  // Keep the process alive; fs.watch handles do that on their own, but an
  // explicit never-resolving await makes the intent visible.
  await new Promise(() => {});
}
