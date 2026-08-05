import * as fs from "fs";
import * as path from "path";
import { parse as parseYaml } from "yaml";

export interface DocumentTarget {
  kind: "document";
  output: string;
}

export interface AgentDefinitionsTarget {
  kind: "agent-definitions";
  sourceDir?: string;
  agents: string[] | "*";
  platforms: string[];
}

export type ConfigTarget = DocumentTarget | AgentDefinitionsTarget;

export interface AgentQuiltConfig {
  sourceDir: string;
  targets: ConfigTarget[];
}

// Mirrors packages/agentquilt-cli/src/core/configLoader.ts's discovery order exactly.
const DISCOVERY_ORDER = [
  ".agentquilt/config.yaml",
  ".agentquilt/config.json",
  "agentquilt.config.yaml",
  "agentquilt.config.json",
];

const DEFAULT_SOURCE_DIR = ".agentquilt/agents";

function normalizeTarget(raw: unknown): ConfigTarget | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const t = raw as Record<string, unknown>;
  if (t.kind === "agent-definitions") {
    const agents = t.agents === "*" ? "*" : Array.isArray(t.agents) ? (t.agents as string[]) : [];
    const platforms = Array.isArray(t.platforms) ? (t.platforms as string[]) : [];
    return {
      kind: "agent-definitions",
      sourceDir: typeof t.sourceDir === "string" ? t.sourceDir : undefined,
      agents,
      platforms,
    };
  }
  // "document" is the schema default when kind is omitted.
  if (t.kind === "document" || t.kind === undefined) {
    if (typeof t.output !== "string") return undefined;
    return { kind: "document", output: t.output };
  }
  return undefined;
}

/**
 * Reads AgentQuilt config using the same discovery order as the CLI.
 * Returns undefined (never throws) if no config file exists or it fails to parse -
 * a pre-`init` workspace is an expected state, not an error.
 */
export function readConfig(workspaceRoot: string): AgentQuiltConfig | undefined {
  for (const relPath of DISCOVERY_ORDER) {
    const absPath = path.join(workspaceRoot, relPath);
    if (!fs.existsSync(absPath)) continue;

    try {
      const raw = fs.readFileSync(absPath, "utf8");
      const parsed = relPath.endsWith(".json") ? JSON.parse(raw) : parseYaml(raw);
      if (typeof parsed !== "object" || parsed === null) return undefined;

      const sourceDir =
        typeof (parsed as Record<string, unknown>).sourceDir === "string"
          ? ((parsed as Record<string, unknown>).sourceDir as string)
          : DEFAULT_SOURCE_DIR;

      const rawTargets = (parsed as Record<string, unknown>).targets;
      const targets = Array.isArray(rawTargets)
        ? rawTargets.map(normalizeTarget).filter((t): t is ConfigTarget => t !== undefined)
        : [];

      return { sourceDir, targets };
    } catch {
      return undefined;
    }
  }
  return undefined;
}
