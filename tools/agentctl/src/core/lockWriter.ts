import { writeFileSync, readFileSync, existsSync } from "fs";
import type { CompiledTarget } from "./compiler.js";
import type { AgentQuiltLock } from "../schemas/lock.schema.js";

/**
 * Difference report for drift detection.
 */
export interface LockDiff {
  changed: boolean;
  fragmentChanges: {
    added: string[];
    removed: string[];
    modified: string[]; // id:oldHash -> newHash
  };
  targetChanges: {
    added: string[];
    removed: string[];
    modified: string[]; // output:oldVersion -> newVersion
  };
  agentChanges: {
    added: string[];
    removed: string[];
    modified: string[]; // name: oldVersion -> newVersion
  };
}

/**
 * Create a lock object from compiled targets and fragment metadata.
 * Sorts fragments by id, targets by output, preserves fragment resolution order per target.
 */
export function createLock(
  fragmentMap: Map<string, { body: string; hash: string; bytes: number; tags: string[] }>,
  compiledTargets: CompiledTarget[],
  agentRecords: any[] = []  // new param, default empty array
): AgentQuiltLock {
  // Build fragments array, sorted by id
  const fragments = Array.from(fragmentMap.entries())
    .map(([id, metadata]) => ({
      id,
      hash: metadata.hash,
      bytes: metadata.bytes,
      tags: metadata.tags,
    }))
    .sort((a, b) => Buffer.from(a.id).compare(Buffer.from(b.id)));

  // Build targets array, sorted by output
  const targets = compiledTargets
    .map((target) => ({
      output: target.output,
      format: target.format,
      fragments: target.fragmentIds, // preserve resolution order
      version: target.version,
    }))
    .sort((a, b) => Buffer.from(a.output).compare(Buffer.from(b.output)));

  // Sort agents by name
  const agents = [...agentRecords].sort((a, b) =>
    Buffer.from(a.name).compare(Buffer.from(b.name))
  );

  return {
    lockfileVersion: 1,
    formatVersion: "1",
    agents,
    fragments,
    targets,
  };
}

/**
 * Write lock to disk as pretty-printed JSON (2-space indent, trailing newline).
 */
export function writeLock(lock: AgentQuiltLock, lockPath: string): void {
  const json = JSON.stringify(lock, null, 2) + "\n";
  writeFileSync(lockPath, json, "utf8");
}

/**
 * Compute difference between disk lock and new lock.
 * Used by `check` command to detect drift.
 */
export function diffLock(diskLock: AgentQuiltLock, newLock: AgentQuiltLock): LockDiff {
  const diskFragMap = new Map(diskLock.fragments.map((f) => [f.id, f]));
  const newFragMap = new Map(newLock.fragments.map((f) => [f.id, f]));

  const diskTargetMap = new Map(diskLock.targets.map((t) => [t.output, t]));
  const newTargetMap = new Map(newLock.targets.map((t) => [t.output, t]));

  // Fragment changes
  const addedFrags = Array.from(newFragMap.keys()).filter((id) => !diskFragMap.has(id));
  const removedFrags = Array.from(diskFragMap.keys()).filter((id) => !newFragMap.has(id));
  const modifiedFrags: string[] = [];

  for (const [id, newFrag] of newFragMap) {
    const diskFrag = diskFragMap.get(id);
    if (diskFrag && diskFrag.hash !== newFrag.hash) {
      modifiedFrags.push(`${id}: ${diskFrag.hash} -> ${newFrag.hash}`);
    }
  }

  // Target changes
  const addedTargets = Array.from(newTargetMap.keys()).filter(
    (output) => !diskTargetMap.has(output)
  );
  const removedTargets = Array.from(diskTargetMap.keys()).filter(
    (output) => !newTargetMap.has(output)
  );
  const modifiedTargets: string[] = [];

  for (const [output, newTarget] of newTargetMap) {
    const diskTarget = diskTargetMap.get(output);
    if (diskTarget && diskTarget.version !== newTarget.version) {
      modifiedTargets.push(`${output}: ${diskTarget.version} -> ${newTarget.version}`);
    }
  }

  // Agent changes
  const agentDiskMap = new Map((diskLock.agents ?? []).map((a) => [a.name, a]));
  const agentNewMap = new Map((newLock.agents ?? []).map((a) => [a.name, a]));

  const addedAgents = Array.from(agentNewMap.keys()).filter((n) => !agentDiskMap.has(n));
  const removedAgents = Array.from(agentDiskMap.keys()).filter((n) => !agentNewMap.has(n));
  const modifiedAgents: string[] = [];

  for (const [name, newAgent] of agentNewMap) {
    const diskAgent = agentDiskMap.get(name);
    if (diskAgent && diskAgent.version !== newAgent.version) {
      modifiedAgents.push(
        `${name}: ${diskAgent.version.substring(0, 12)}... -> ${newAgent.version.substring(0, 12)}...`
      );
    }
  }

  const changed =
    addedFrags.length > 0 ||
    removedFrags.length > 0 ||
    modifiedFrags.length > 0 ||
    addedTargets.length > 0 ||
    removedTargets.length > 0 ||
    modifiedTargets.length > 0 ||
    addedAgents.length > 0 ||
    removedAgents.length > 0 ||
    modifiedAgents.length > 0;

  return {
    changed,
    fragmentChanges: {
      added: addedFrags,
      removed: removedFrags,
      modified: modifiedFrags,
    },
    targetChanges: {
      added: addedTargets,
      removed: removedTargets,
      modified: modifiedTargets,
    },
    agentChanges: {
      added: addedAgents,
      removed: removedAgents,
      modified: modifiedAgents,
    },
  };
}

/**
 * Read lock from disk. Returns null if file doesn't exist.
 */
export function readLock(lockPath: string): AgentQuiltLock | null {
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    const content = readFileSync(lockPath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
