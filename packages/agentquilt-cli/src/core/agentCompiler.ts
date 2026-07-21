import path from "path";
import { resolveAgents } from "./agentLoader.js";
import { hashAgent, computeAgentVersion, type OutputEntry } from "./agentHasher.js";
import { resolveModel } from "./modelResolver.js";
import { getAdapter, type AdapterOutput } from "./adapters/index.js";
import { ConfigError } from "./configLoader.js";
import { AgentQuiltConfig } from "../schemas/config.schema.js";
import type { AgentLockRecord, AgentOutputRecord } from "../schemas/lock.schema.js";
import { fragmentHash } from "./normalize.js";
import { byteCompare } from "./sortUtil.js";
import { assertContainedIncludingSymlinks, PathClaimTracker } from "./pathSecurity.js";

export type { AdapterOutput } from "./adapters/index.js";

export interface CompiledAgentTarget {
  agentRecords: AgentLockRecord[];
  outputs: Map<string, AdapterOutput[]>;
  fragmentMap: Map<string, { body: string; hash: string; bytes: number; tags: string[] }>;
  /** Agent name -> bodyHash, computed once per agent by hashAgent() so
   * mergeCompiledAgentTargets doesn't need to rebuild and re-hash the same
   * fragment refs when combining results from multiple targets. */
  bodyHashByName: Map<string, string>;
}

export interface AgentDefinitionsTarget {
  kind: "agent-definitions";
  sourceDir?: string;  // Override global sourceDir for this target
  agents: string[] | "*";
  platforms: string[];
  outputPaths?: Record<string, string>;
}

export function mergeCompiledAgentTargets(
  results: CompiledAgentTarget[]
): CompiledAgentTarget {
  const mergedFragmentMap = new Map<
    string,
    { body: string; hash: string; bytes: number; tags: string[] }
  >();
  const recordsByName = new Map<string, AgentLockRecord>();
  const outputsByName = new Map<string, AdapterOutput[]>();
  const outputClaims = new PathClaimTracker();
  const bodyHashByName = new Map<string, string>();

  for (const result of results) {
    for (const [id, metadata] of result.fragmentMap) {
      const previous = mergedFragmentMap.get(id);
      if (previous !== undefined && previous.hash !== metadata.hash) {
        throw new ConfigError(`Fragment "${id}" resolves to conflicting content across targets`);
      }
      mergedFragmentMap.set(id, metadata);
    }

    for (const [name, bodyHash] of result.bodyHashByName) {
      // Every target contributing a record with this name is guaranteed
      // (by the incompatible-definitions check below) to have identical
      // bodyFragments, so all contributed bodyHash values are identical too
      // — first-wins is safe here, no need to compare or recompute.
      if (!bodyHashByName.has(name)) {
        bodyHashByName.set(name, bodyHash);
      }
    }

    for (const record of result.agentRecords) {
      const previousRecord = recordsByName.get(record.name);
      if (
        previousRecord !== undefined &&
        (previousRecord.dir !== record.dir ||
          previousRecord.metaHash !== record.metaHash ||
          JSON.stringify(previousRecord.bodyFragments) !== JSON.stringify(record.bodyFragments))
      ) {
        throw new ConfigError(
          `Agent "${record.name}" resolves to incompatible canonical definitions across targets`
        );
      }

      for (const output of result.outputs.get(record.name) ?? []) {
        const owner = `${record.name} (${output.path})`;
        outputClaims.claim(
          output.path,
          owner,
          (previousOwner) =>
            `Adapter output path collision: ${previousOwner} and ${owner} resolve to the same portable path`
        );
        const mergedOutputs = outputsByName.get(record.name) ?? [];
        mergedOutputs.push(output);
        outputsByName.set(record.name, mergedOutputs);
      }

      if (previousRecord === undefined) {
        recordsByName.set(record.name, { ...record, outputs: [...record.outputs] });
      } else {
        previousRecord.outputs.push(...record.outputs);
      }
    }
  }

  const agentRecords = [...recordsByName.values()];
  for (const record of agentRecords) {
    record.outputs.sort((a, b) => {
      const platformOrder = byteCompare(a.platform, b.platform);
      return platformOrder !== 0 ? platformOrder : byteCompare(a.path, b.path);
    });
    outputsByName.get(record.name)?.sort((a, b) => byteCompare(a.path, b.path));

    const bodyHash = bodyHashByName.get(record.name);
    if (bodyHash === undefined) {
      throw new ConfigError(`Missing body hash for agent "${record.name}"`);
    }
    const outputEntries: OutputEntry[] = record.outputs.map((output) => {
      if (output.kind !== "file") {
        throw new ConfigError(
          `Adapter output "${output.path}" uses legacy unsupported kind "${output.kind}"`
        );
      }
      const adapter = getAdapter(output.platform);
      if (adapter === undefined) {
        throw new ConfigError(`Unknown adapter "${output.platform}" while merging outputs`);
      }
      return {
        platform: output.platform,
        path: output.path,
        kind: output.kind,
        adapterVersion: adapter.ADAPTER_VERSION,
        outputHash: output.hash,
      };
    });
    record.version = computeAgentVersion(
      record.name,
      bodyHash,
      record.metaHash,
      outputEntries
    );
  }
  agentRecords.sort((a, b) => byteCompare(a.name, b.name));

  return {
    agentRecords,
    outputs: outputsByName,
    fragmentMap: mergedFragmentMap,
    bodyHashByName,
  };
}

export async function compileAgentDefinitionsTarget(
  target: AgentDefinitionsTarget,
  config: AgentQuiltConfig,
  sourceDir: string,
  repoRoot: string
): Promise<CompiledAgentTarget> {
  // Use target-specific sourceDir if provided, otherwise use global sourceDir
  const targetSourceDir = target.sourceDir ? path.resolve(sourceDir, "..", target.sourceDir) : sourceDir;
  const resolvedRepoRoot = path.resolve(repoRoot);
  assertContainedIncludingSymlinks(
    targetSourceDir,
    resolvedRepoRoot,
    `agent-definitions target sourceDir escapes the repository: "${target.sourceDir}"`,
    `agent-definitions target sourceDir escapes the repository through a symlink: "${target.sourceDir}"`
  );

  // Resolve agent list
  const records = resolveAgents(target.agents, targetSourceDir, repoRoot);

  // Hash agents and collect outputs
  const agentLockRecords: AgentLockRecord[] = [];
  const allOutputs = new Map<string, AdapterOutput[]>();
  const allFragmentMap = new Map<string, { body: string; hash: string; bytes: number; tags: string[] }>();
  const outputClaims = new PathClaimTracker();
  const bodyHashByName = new Map<string, string>();

  for (const record of records) {
    const { bodyHash, metaHash, fragmentMap } = hashAgent(record);
    bodyHashByName.set(record.name, bodyHash);

    // Merge fragment map
    for (const [id, meta] of fragmentMap) {
      allFragmentMap.set(id, meta);
    }

    // Run registered adapters for each platform
    const outputs: AgentOutputRecord[] = [];
    const adapterOutputsByPlatform: Array<AdapterOutput & { platform: string }> = [];
    const outputEntries: OutputEntry[] = [];

    for (const platform of target.platforms) {
      const adapter = getAdapter(platform);
      if (!adapter) {
        // Phase 2 onwards: no adapters registered, skip silently
        continue;
      }
      const resolvedModel = resolveModel(record.definition, platform, config);
      const adapterOutputs = adapter.outputsFor(record, resolvedModel, config);
      for (const out of adapterOutputs) {
        if (out.kind !== undefined && out.kind !== "file") {
          throw new ConfigError(
            `Adapter output "${out.path}" uses legacy unsupported kind "${out.kind}"`
          );
        }
        outputClaims.claim(
          out.path,
          `${record.name}/${platform}`,
          (previousOwner) =>
            `Adapter output path collision: ${previousOwner} and ` +
            `${record.name}/${platform} both emit the portable path "${out.path}"`
        );

        // Adapter outputs are already complete serialized files. Hash their
        // exact bytes rather than applying source-fragment normalization.
        const outHash = fragmentHash(out.content);
        adapterOutputsByPlatform.push({ ...out, content: out.content, platform }); // Store platform for later
        outputs.push({
          platform,
          path: out.path,
          kind: out.kind ?? "file",
          hash: outHash,
        });
        outputEntries.push({
          platform,
          path: out.path,
          kind: out.kind ?? "file",
          adapterVersion: adapter.ADAPTER_VERSION,
          outputHash: outHash,
        });
      }
    }

    // Finalize agent version with output entries
    const finalVersion = computeAgentVersion(record.name, bodyHash, metaHash, outputEntries);

    // Adapters own their complete output bytes. Hashing, writing, and drift
    // checking must all observe exactly the same content.
    outputs.sort((a, b) => {
      const platformOrder = byteCompare(a.platform, b.platform);
      return platformOrder !== 0 ? platformOrder : byteCompare(a.path, b.path);
    });
    adapterOutputsByPlatform.sort((a, b) => {
      const platformOrder = byteCompare(a.platform, b.platform);
      return platformOrder !== 0 ? platformOrder : byteCompare(a.path, b.path);
    });

    // Store adapter outputs in allOutputs map for later retrieval
    if (adapterOutputsByPlatform.length > 0) {
      allOutputs.set(record.name, adapterOutputsByPlatform);
    }

    agentLockRecords.push({
      name: record.name,
      dir: record.dir,
      bodyFragments: record.bodyFragments.map((f) => f.id),
      metaHash,
      version: finalVersion,
      outputs,
    });
  }

  return {
    agentRecords: agentLockRecords,
    outputs: allOutputs,
    fragmentMap: allFragmentMap,
    bodyHashByName,
  };
}
