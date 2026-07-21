import { Command } from "commander";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import path from "path";
import { findConfigFile, loadConfig, validateConfig, ConfigError } from "../core/configLoader.js";
import { compile } from "../core/compiler.js";
import {
  compileAgentDefinitionsTarget,
  mergeCompiledAgentTargets,
} from "../core/agentCompiler.js";
import { createLock, writeLock, readLock } from "../core/lockWriter.js";
import { watchTree, watchFile, WatchHandle } from "../core/watcher.js";
import type { AgentQuiltConfig } from "../schemas/config.schema.js";
import { bold, cyan, dim, red, sym, formatDuration, createSpinner } from "../ui/terminal.js";
import { fragmentHash, normalize } from "../core/normalize.js";
import type { AgentLockRecord } from "../schemas/lock.schema.js";
import { validateOutputPaths, type OutputPathClaim } from "../core/pathSecurity.js";

interface BuildOptions {
  config?: string;
  cwd: string;
  quiet?: boolean;
  watch?: boolean;
  force?: boolean;
}

/**
 * Returns the on-disk content if the file exists and differs from what a
 * fresh build would write, or null if there's nothing to protect (file
 * doesn't exist yet, or disk already matches). Shared by isTampered and
 * adapterBlockReason, which each layer their own decision logic on top.
 */
function diskContentIfDiffers(outputPath: string, freshContent: string): string | null {
  if (!existsSync(outputPath)) return null;
  const diskContent = readFileSync(outputPath, "utf8");
  return diskContent === freshContent ? null : diskContent;
}

/**
 * A generated file was found on disk with content that doesn't match what a
 * fresh build would produce, AND its recorded source version in the previous
 * lock is unchanged from the version we'd compute now. That combination is
 * only possible if the file was hand-edited outside of `agentquilt build`
 * since the last build — a deterministic compiler would have produced
 * identical bytes for identical source. Refuse to clobber it silently.
 */
function isTampered(
  outputPath: string,
  freshContent: string,
  oldVersion: string | undefined,
  newVersion: string
): boolean {
  if (oldVersion === undefined) return false; // never built before — nothing to protect
  if (oldVersion !== newVersion) return false; // legitimate source change — self-heal
  return diskContentIfDiffers(outputPath, freshContent) !== null;
}

type AdapterBlockReason = "first-claim" | "tampered" | null;

function adapterBlockReason(
  outputPath: string,
  freshContent: string,
  freshHash: string,
  oldHash: string | undefined,
  legacySourceUnchanged: boolean
): AdapterBlockReason {
  if (diskContentIfDiffers(outputPath, freshContent) === null) return null;
  if (oldHash === undefined) return "first-claim";
  const legacyHash = fragmentHash(normalize(Buffer.from(freshContent, "utf8")));
  return oldHash === freshHash || (legacySourceUnchanged && oldHash === legacyHash)
    ? "tampered"
    : null;
}

function hasUnchangedCanonicalSource(
  oldAgent: AgentLockRecord | undefined,
  newAgent: AgentLockRecord,
  oldFragmentHashById: Map<string, string>,
  newFragmentHashById: Map<string, string>
): boolean {
  return oldAgent !== undefined &&
    oldAgent.metaHash === newAgent.metaHash &&
    JSON.stringify(oldAgent.bodyFragments) === JSON.stringify(newAgent.bodyFragments) &&
    newAgent.bodyFragments.every(
      (id) => oldFragmentHashById.get(id) === newFragmentHashById.get(id)
    );
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
    .option(
      "--force",
      "overwrite generated files even if they were hand-edited outside of build since the last build"
    )
    .action(buildAction);
}

interface BuildResult {
  config: AgentQuiltConfig;
  configPath: string;
  /** Absolute paths of every file the build wrote (outputs + lock). */
  writtenPaths: Set<string>;
  /** Repo-relative output paths skipped because they were hand-edited since the last build. */
  blocked: string[];
}

export async function executeBuild(options: BuildOptions): Promise<BuildResult> {
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
  let agentResults: Awaited<ReturnType<typeof compileAgentDefinitionsTarget>>[] = [];

  try {
    configPath = options.config || findConfigFile(cwd);
    config = loadConfig(configPath);
    const sourceDir = path.join(cwd, config.sourceDir);
    validateConfig(config, sourceDir, cwd);

    spinner.update("Compiling fragments…");
    result = await compile(config, sourceDir);

    spinner.update("Compiling agents…");
    agentResults = await Promise.all(
      config.targets
        .filter((target) => target.kind === "agent-definitions")
        .map((target) => compileAgentDefinitionsTarget(target, config, sourceDir, cwd))
    );
    const merged = mergeCompiledAgentTargets(agentResults);
    agentResults.splice(0, agentResults.length, merged);
    const lockOutput = ["agentquilt", "lock"].join(".");
    const claims: OutputPathClaim[] = [
      ...result.targets.map((target) => ({
        path: target.output,
        owner: `document target ${target.output}`,
      })),
      ...[...merged.outputs.entries()].flatMap(([agentName, outputs]) =>
        outputs.map((output) => ({
          path: output.path,
          owner: `agent ${agentName}`,
        }))
      ),
      { path: lockOutput, owner: "AgentQuilt lock" },
    ];
    validateOutputPaths(cwd, claims);
  } finally {
    spinner.stop();
  }

  // Read the previous lock (if any) to tell a legitimate rebuild (source
  // changed since last build) apart from a hand-edited generated file (source
  // unchanged, disk content unchanged from last known version, yet the file
  // on disk no longer matches what that version compiles to).
  const oldLock = options.force ? null : readLock(path.join(cwd, "agentquilt.lock"));
  const oldTargetVersionByOutput = new Map((oldLock?.targets ?? []).map((t) => [t.output, t.version]));
  const oldAgentHashByOutput = new Map<string, string>();
  const oldAgentByName = new Map((oldLock?.agents ?? []).map((agent) => [agent.name, agent]));
  const oldFragmentHashById = new Map(
    (oldLock?.fragments ?? []).map((fragment) => [fragment.id, fragment.hash])
  );
  for (const agent of oldLock?.agents ?? []) {
    for (const output of agent.outputs) {
      oldAgentHashByOutput.set(output.path, output.hash);
    }
  }

  const blocked: string[] = [];

  let agentRecords: any[] = [];
  const allFragmentMap = new Map(result.fragmentMap);
  for (const agentResult of agentResults) {
    agentRecords.push(...agentResult.agentRecords);
    for (const [id, meta] of agentResult.fragmentMap) {
      allFragmentMap.set(id, meta);
    }
  }

  // Preflight every output before writing anything, so a refused claim or
  // tamper finding leaves the existing output set and lock mutually intact.
  if (!options.force) {
    for (const target of result.targets) {
      const outputPath = path.resolve(cwd, target.output);
      if (
        isTampered(
          outputPath,
          target.content,
          oldTargetVersionByOutput.get(target.output),
          target.version
        )
      ) {
        blocked.push(target.output);
        if (!options.quiet) {
          console.error(
            `${sym.fail} ${bold(target.output)}: hand-edited outside of build since the last build - refusing to overwrite`
          );
        }
      }
    }

    for (const agentResult of agentResults) {
      for (const record of agentResult.agentRecords) {
        const freshHashByPath = new Map(
          record.outputs.map((output) => [output.path, output.hash])
        );
        const legacySourceUnchanged = hasUnchangedCanonicalSource(
          oldAgentByName.get(record.name),
          record,
          oldFragmentHashById,
          new Map(
            record.bodyFragments.map((id) => [id, allFragmentMap.get(id)?.hash ?? ""])
          )
        );
        for (const output of agentResult.outputs.get(record.name) ?? []) {
          const reason = adapterBlockReason(
            path.resolve(cwd, output.path),
            output.content,
            freshHashByPath.get(output.path)!,
            oldAgentHashByOutput.get(output.path),
            legacySourceUnchanged
          );
          if (reason === null) continue;
          blocked.push(output.path);
          if (!options.quiet) {
            if (reason === "first-claim") {
              console.error(
                `${sym.fail} ${output.path}: existing user-owned file is not yet claimed - refusing to overwrite`
              );
              console.error(
                dim(`  Rerun with ${cyan("--force")} only if AgentQuilt should own this path.`)
              );
            } else {
              console.error(
                `${sym.fail} ${output.path}: hand-edited outside of build since the last build - refusing to overwrite`
              );
            }
          }
        }
      }
    }
  }

  if (blocked.length > 0) {
    if (!options.quiet) {
      console.error(`${sym.fail} ${red(`${blocked.length} generated file(s) blocked`)}`);
    }
    return { config, configPath, writtenPaths, blocked };
  }

  // Phase 2: write outputs and report.
  for (const target of result.targets) {
    const outputPath = path.resolve(cwd, target.output);

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

  for (const agentResult of agentResults) {
    // Write adapter outputs
    for (const record of agentResult.agentRecords) {
      const outputs = agentResult.outputs.get(record.name) ?? [];

      for (const output of outputs) {
        const outputPath = path.resolve(cwd, output.path);

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

  return { config, configPath, writtenPaths, blocked };
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
    const result = await executeBuild(options);
    process.exit(result.blocked.length > 0 ? 1 : 0);
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
  const runBuild = async (): Promise<number> => {
    try {
      const result = await executeBuild(options);
      config = result.config;
      writtenPaths = result.writtenPaths;
      if (!options.quiet) {
        console.log(dim(`  watching for changes… (ctrl-c to stop)`));
      }
      return result.blocked.length > 0 ? 1 : 0;
    } catch (err) {
      const exitCode = reportError(err);
      if (!options.quiet) {
        console.log(dim(`  watching for changes… (ctrl-c to stop)`));
      }
      return exitCode;
    }
  };

  // Never install watchers from a config that failed the initial build and
  // validation pass; otherwise an escaped sourceDir could still be watched.
  const initialExitCode = await runBuild();
  if (initialExitCode !== 0) {
    process.exit(initialExitCode);
  }

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
