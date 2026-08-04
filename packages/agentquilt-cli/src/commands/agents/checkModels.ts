import { Command } from "commander";
import path from "path";
import {
  ConfigError,
  findConfigFile,
  loadConfig,
  validateConfig,
} from "../../core/configLoader.js";
import { discoverAgentDirs, loadAgentDir } from "../../core/agentLoader.js";
import { resolveModel } from "../../core/modelResolver.js";
import { modelCatalogReaders } from "../../core/modelCatalog.js";
import { bold, dim, red, yellow, sym } from "../../ui/terminal.js";

interface CheckModelsOptions {
  config?: string;
  cwd: string;
}

type RowStatus = "OK" | "WARN" | "SKIPPED";

interface Row {
  agent: string;
  platform: string;
  model: string;
  status: RowStatus;
  detail?: string;
}

export function registerCheckModelsCommand(program: Command): void {
  program
    .command("check-models")
    .description(
      "Advisory: warn if committed modelTiers entries look stale against a platform's local CLI cache (never blocks build/check)"
    )
    .option("--config <path>", "path to config file")
    .option("--cwd <dir>", "working directory", process.cwd())
    .action((options) => checkModelsAction(options));
}

function checkModelsAction(options: CheckModelsOptions): void {
  try {
    const cwd = options.cwd || process.cwd();
    const configPath = options.config || findConfigFile(cwd);
    const config = loadConfig(configPath);
    const sourceDir = path.join(cwd, config.sourceDir);

    validateConfig(config, sourceDir, cwd);

    const agentDirs = discoverAgentDirs(sourceDir);
    if (agentDirs.length === 0) {
      console.log("No agents found.");
      process.exit(0);
    }

    // Cache catalog reads per platform; a reader is best-effort and never
    // throws, but only needs to run once regardless of agent count.
    const catalogs = new Map<string, Set<string> | null>();
    const seen = new Set<string>(); // dedupe identical (platform, model) rows

    const rows: Row[] = [];

    for (const agentDir of agentDirs) {
      const record = loadAgentDir(agentDir, cwd);

      const platforms = new Set<string>();
      for (const target of config.targets) {
        if (target.kind !== "agent-definitions" || target.sourceDir) continue;
        const included =
          target.agents === "*" ||
          (Array.isArray(target.agents) && target.agents.includes(record.name));
        if (!included) continue;
        for (const plat of target.platforms) platforms.add(plat);
      }

      for (const platform of platforms) {
        let resolved: ReturnType<typeof resolveModel>;
        try {
          resolved = resolveModel(record.definition, platform, config);
        } catch {
          // Unresolvable models are `agents list`'s concern; skip here.
          continue;
        }
        if (resolved.model === null) continue; // inherit: nothing to check

        const dedupeKey = `${platform}:${resolved.model}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        if (!catalogs.has(platform)) {
          const reader = modelCatalogReaders[platform];
          catalogs.set(platform, reader ? reader() : null);
        }
        const catalog = catalogs.get(platform) ?? null;

        if (!modelCatalogReaders[platform]) {
          rows.push({
            agent: record.name,
            platform,
            model: resolved.model,
            status: "SKIPPED",
            detail: "no known cache source for this platform",
          });
        } else if (catalog === null) {
          rows.push({
            agent: record.name,
            platform,
            model: resolved.model,
            status: "SKIPPED",
            detail: "local cache unavailable",
          });
        } else if (catalog.has(resolved.model)) {
          rows.push({ agent: record.name, platform, model: resolved.model, status: "OK" });
        } else {
          rows.push({
            agent: record.name,
            platform,
            model: resolved.model,
            status: "WARN",
            detail: "not found in local cache — may be stale, renamed, or simply not yet cached",
          });
        }
      }
    }

    printRows(rows);

    const hasWarnings = rows.some((r) => r.status === "WARN");
    process.exit(hasWarnings ? 1 : 0);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`${sym.fail} ${err.message}`);
      process.exit(2);
    }
    console.error(`${sym.fail} Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(3);
  }
}

function printRows(rows: Row[]): void {
  if (rows.length === 0) {
    console.log("No model-tiered agents to check.");
    return;
  }

  console.log("");
  console.log(bold("Model freshness (advisory only — never blocks build/check):"));
  console.log("");

  const platformWidth = Math.max(8, ...rows.map((r) => r.platform.length));
  const modelWidth = Math.max(5, ...rows.map((r) => r.model.length));

  const statusWidth = Math.max(...rows.map((r) => r.status.length));

  for (const row of rows) {
    const paddedStatus = row.status.padEnd(statusWidth);
    const statusLabel =
      row.status === "OK" ? dim(paddedStatus) : row.status === "WARN" ? red(paddedStatus) : yellow(paddedStatus);
    const detail = row.detail ? dim(` (${row.detail})`) : "";
    console.log(
      `${statusLabel} ${row.platform.padEnd(platformWidth)}  ${row.model.padEnd(modelWidth)}  ${dim(row.agent)}${detail}`
    );
  }
  console.log("");
}
