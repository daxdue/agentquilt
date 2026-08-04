import * as fs from "fs";
import * as path from "path";
import { parseDocument, isMap, isSeq } from "yaml";

// Mirrors packages/agentquilt-cli/src/core/configLoader.ts's discovery order exactly.
const DISCOVERY_ORDER = [
  ".agentquilt/config.yaml",
  ".agentquilt/config.json",
  "agentquilt.config.yaml",
  "agentquilt.config.json",
];

// Hardcoded: the CLI has no --json/list-adapters output to query at runtime,
// and the extension never imports CLI internals as a library. Update this
// list if a new adapter is registered under
// packages/agentquilt-cli/src/core/adapters/.
export const KNOWN_PLATFORMS = ["claude", "codex"];

export interface AgentDefinitionsTargetSummary {
  index: number; // position within config.targets, used to address it for writes
  sourceDir?: string;
  platforms: string[];
}

interface ConfigLocation {
  absPath: string;
  isJson: boolean;
}

function locateConfigFile(workspaceRoot: string): ConfigLocation | undefined {
  for (const relPath of DISCOVERY_ORDER) {
    const absPath = path.join(workspaceRoot, relPath);
    if (fs.existsSync(absPath)) return { absPath, isJson: relPath.endsWith(".json") };
  }
  return undefined;
}

/** Lists every agent-definitions target in the config, in source order. Never throws. */
export function listAgentDefinitionsTargets(workspaceRoot: string): AgentDefinitionsTargetSummary[] {
  const loc = locateConfigFile(workspaceRoot);
  if (!loc) return [];

  try {
    if (loc.isJson) {
      const parsed = JSON.parse(fs.readFileSync(loc.absPath, "utf8")) as { targets?: unknown };
      const targets = Array.isArray(parsed.targets) ? parsed.targets : [];
      const result: AgentDefinitionsTargetSummary[] = [];
      targets.forEach((raw, index) => {
        const target = raw as Record<string, unknown>;
        if (target.kind === "agent-definitions") {
          result.push({
            index,
            sourceDir: typeof target.sourceDir === "string" ? target.sourceDir : undefined,
            platforms: Array.isArray(target.platforms) ? (target.platforms as string[]) : [],
          });
        }
      });
      return result;
    }

    const doc = parseDocument(fs.readFileSync(loc.absPath, "utf8"));
    const targetsNode = doc.get("targets");
    if (!isSeq(targetsNode)) return [];

    const result: AgentDefinitionsTargetSummary[] = [];
    targetsNode.items.forEach((item, index) => {
      if (!isMap(item)) return;
      if (item.get("kind") !== "agent-definitions") return;
      const platformsNode = item.get("platforms");
      const platforms = isSeq(platformsNode) ? (platformsNode.toJSON() as string[]) : [];
      const sourceDir = item.get("sourceDir");
      result.push({
        index,
        sourceDir: typeof sourceDir === "string" ? sourceDir : undefined,
        platforms,
      });
    });
    return result;
  } catch {
    return [];
  }
}

export interface AddPlatformResult {
  ok: boolean;
  alreadyEnabled?: boolean;
  error?: string;
}

/**
 * Adds `platform` to the platforms array of the agent-definitions target at
 * `targetIndex` (as returned by listAgentDefinitionsTargets). Idempotent -
 * returns alreadyEnabled instead of duplicating an existing entry.
 *
 * Uses the yaml package's Document API (not parse+stringify a plain object)
 * specifically so existing comments and formatting in config.yaml survive -
 * verified against this repo's own config.yaml, which has several.
 */
export function addPlatformToTarget(workspaceRoot: string, targetIndex: number, platform: string): AddPlatformResult {
  const loc = locateConfigFile(workspaceRoot);
  if (!loc) return { ok: false, error: "No AgentQuilt config found. Run `agentquilt init` first." };

  try {
    if (loc.isJson) {
      const raw = fs.readFileSync(loc.absPath, "utf8");
      const parsed = JSON.parse(raw) as { targets?: Record<string, unknown>[] };
      const target = parsed.targets?.[targetIndex];
      if (!target || target.kind !== "agent-definitions") {
        return { ok: false, error: "Target not found or not an agent-definitions target." };
      }
      const platforms = Array.isArray(target.platforms) ? (target.platforms as string[]) : [];
      if (platforms.includes(platform)) return { ok: true, alreadyEnabled: true };
      platforms.push(platform);
      target.platforms = platforms;
      fs.writeFileSync(loc.absPath, JSON.stringify(parsed, null, 2) + "\n");
      return { ok: true };
    }

    const raw = fs.readFileSync(loc.absPath, "utf8");
    const doc = parseDocument(raw);
    const targetsNode = doc.get("targets");
    if (!isSeq(targetsNode)) return { ok: false, error: "Config has no targets list." };

    const item = targetsNode.items[targetIndex];
    if (!isMap(item) || item.get("kind") !== "agent-definitions") {
      return { ok: false, error: "Target not found or not an agent-definitions target." };
    }

    const platformsNode = item.get("platforms");
    if (isSeq(platformsNode)) {
      const current = platformsNode.toJSON() as string[];
      if (current.includes(platform)) return { ok: true, alreadyEnabled: true };
      platformsNode.add(platform);
    } else {
      item.set("platforms", [platform]);
    }

    fs.writeFileSync(loc.absPath, doc.toString());
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
