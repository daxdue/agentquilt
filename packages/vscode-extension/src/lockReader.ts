import * as fs from "fs";
import * as path from "path";
import { AgentNode } from "./model";

const LOCK_FILE = "agentquilt.lock";

interface RawAgentOutput {
  platform?: unknown;
  path?: unknown;
}

interface RawAgent {
  name?: unknown;
  dir?: unknown;
  bodyFragments?: unknown;
  outputs?: unknown;
}

interface RawLock {
  lockfileVersion?: unknown;
  formatVersion?: unknown;
  fragments?: unknown;
  targets?: unknown;
  agents?: unknown;
}

function toAgentNode(raw: RawAgent): AgentNode | undefined {
  if (typeof raw.name !== "string" || typeof raw.dir !== "string") return undefined;
  const fragments = Array.isArray(raw.bodyFragments)
    ? raw.bodyFragments.filter((f): f is string => typeof f === "string")
    : [];
  const outputs = Array.isArray(raw.outputs)
    ? raw.outputs
        .map((o: RawAgentOutput) =>
          typeof o.platform === "string" && typeof o.path === "string"
            ? { platform: o.platform, path: o.path }
            : undefined,
        )
        .filter((o): o is { platform: string; path: string } => o !== undefined)
    : [];
  return { name: raw.name, dir: raw.dir, fragments, outputs };
}

/**
 * Reads agentquilt.lock from the workspace root and returns the agents it
 * records. Returns undefined (never throws) if the file is missing or does
 * not match the expected shape - callers fall back to agentScanner in that case.
 */
export function readLockAgents(workspaceRoot: string): AgentNode[] | undefined {
  const lockPath = path.join(workspaceRoot, LOCK_FILE);
  if (!fs.existsSync(lockPath)) return undefined;

  try {
    const raw = JSON.parse(fs.readFileSync(lockPath, "utf8")) as RawLock;
    if (raw.lockfileVersion !== 1 || raw.formatVersion !== "1" || !Array.isArray(raw.agents)) {
      return undefined;
    }
    return raw.agents
      .map((a) => toAgentNode(a as RawAgent))
      .filter((a): a is AgentNode => a !== undefined);
  } catch {
    return undefined;
  }
}
