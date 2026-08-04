import { Command } from "commander";
import { readFileSync } from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import {
  ConfigError,
  findConfigFile,
  loadConfig,
  validateConfig,
} from "../core/configLoader.js";
import { discoverAgentDirs, loadAgentDir, type BodyFragment } from "../core/agentLoader.js";
import { bold, dim, red, yellow, green, sym } from "../ui/terminal.js";

interface LintOptions {
  config?: string;
  cwd: string;
}

type Level = "ERROR" | "WARN";

interface Finding {
  fragmentId: string;
  level: Level;
  message: string;
}

interface AgentReport {
  agentId: string;
  findings: Finding[];
}

// Same ordering-prefix convention fragmentScanner.ts uses for document
// targets (see its parseFilePrefix); duplicated here rather than shared
// because agentLoader's BodyFragment doesn't carry a parsed prefix field.
function parsePrefix(fileName: string): string | null {
  const match = fileName.match(/^(\d{3})-/);
  return match ? match[1] : null;
}

function checkPrefixCollisions(fragments: BodyFragment[]): Finding[] {
  const byPrefix = new Map<string, BodyFragment[]>();
  for (const fragment of fragments) {
    const prefix = parsePrefix(fragment.fileName);
    if (prefix === null) continue;
    const group = byPrefix.get(prefix) ?? [];
    group.push(fragment);
    byPrefix.set(prefix, group);
  }

  const findings: Finding[] = [];
  for (const [prefix, group] of byPrefix) {
    if (group.length < 2) continue;
    const ids = group.map((f) => f.id).join(", ");
    for (const fragment of group) {
      findings.push({
        fragmentId: fragment.id,
        level: "ERROR",
        message: `ordering prefix "${prefix}" collides with ${group.length - 1} other fragment(s) in this agent: ${ids}`,
      });
    }
  }
  return findings;
}

// fragmentScanner.ts's own front-matter tag extraction silently swallows
// YAML parse errors and returns []; this re-parses to surface the error as
// an actual finding instead of losing it.
function checkFrontmatter(fragment: BodyFragment): Finding[] {
  const findings: Finding[] = [];
  let text: string;
  try {
    text = readFileSync(fragment.filePath, "utf8");
  } catch {
    return findings; // unreadable file is reported elsewhere (I/O error path)
  }

  const bom = "﻿";
  if (text.startsWith(bom)) text = text.slice(1);

  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return findings;

  let parsed: unknown;
  try {
    parsed = parseYaml(match[1]);
  } catch (err) {
    findings.push({
      fragmentId: fragment.id,
      level: "WARN",
      message: `front-matter is not valid YAML: ${err instanceof Error ? err.message : String(err)}`,
    });
    return findings;
  }

  if (parsed && typeof parsed === "object" && "tags" in parsed) {
    const tags = (parsed as { tags: unknown }).tags;
    const isStringArray = Array.isArray(tags) && tags.every((t) => typeof t === "string");
    if (!isStringArray) {
      findings.push({
        fragmentId: fragment.id,
        level: "WARN",
        message: `front-matter "tags" should be an array of strings`,
      });
    }
  }

  return findings;
}

export function registerLintCommand(program: Command): void {
  program
    .command("lint")
    .description("Validate agent manifests and fragments: schema, ordering-prefix collisions, front-matter")
    .option("--config <path>", "path to config file")
    .option("--cwd <dir>", "working directory", process.cwd())
    .action((options) => lintAction(options));
}

function lintAction(options: LintOptions): void {
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

    const reports: AgentReport[] = [];

    for (const agentDir of agentDirs) {
      const agentId = path.relative(cwd, agentDir).replace(/\\/g, "/");
      const findings: Finding[] = [];

      let record;
      try {
        record = loadAgentDir(agentDir, cwd);
      } catch (err) {
        findings.push({
          fragmentId: path.join(agentId, "agent.yaml").replace(/\\/g, "/"),
          level: "ERROR",
          message: err instanceof Error ? err.message : String(err),
        });
        reports.push({ agentId, findings });
        continue; // no valid record to run the remaining rules against
      }

      findings.push(...checkPrefixCollisions(record.bodyFragments));
      for (const fragment of record.bodyFragments) {
        findings.push(...checkFrontmatter(fragment));
      }

      const wired = config.targets.some(
        (target) =>
          target.kind === "agent-definitions" &&
          !target.sourceDir &&
          (target.agents === "*" ||
            (Array.isArray(target.agents) && target.agents.includes(record.name)))
      );
      if (!wired) {
        findings.push({
          fragmentId: agentId,
          level: "ERROR",
          message: `agent "${record.name}" is not included in any agent-definitions target`,
        });
      }

      reports.push({ agentId, findings });
    }

    printReports(reports);

    const hasError = reports.some((r) => r.findings.some((f) => f.level === "ERROR"));
    process.exit(hasError ? 1 : 0);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`${sym.fail} ${err.message}`);
      process.exit(2);
    }
    console.error(`${sym.fail} Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(3);
  }
}

function printReports(reports: AgentReport[]): void {
  for (const report of reports) {
    const hasError = report.findings.some((f) => f.level === "ERROR");
    const status = hasError ? red("failed") : green("passed");

    console.log(`${bold("Agent:")} ${report.agentId}`);
    console.log(`${bold("Status:")} ${status}`);
    console.log("");

    for (const finding of report.findings) {
      const label = finding.level === "ERROR" ? red("ERROR") : yellow("WARN");
      console.log(`${label} ${dim(finding.fragmentId)}: ${finding.message}`);
    }
    if (report.findings.length === 0) {
      console.log(dim(`${sym.ok} no findings`));
    }
    console.log("");
  }
}
