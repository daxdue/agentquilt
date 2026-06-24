import { resolveAgents } from "./agentLoader.js";
import { hashAgent, computeAgentVersion, type OutputEntry } from "./agentHasher.js";
import { resolveModel } from "./modelResolver.js";
import { getAdapter } from "./adapters/index.js";
import { AgentQuiltConfig } from "../schemas/config.schema.js";
import type { AgentLockRecord, AgentOutputRecord } from "../schemas/lock.schema.js";
import { normalize, fragmentHash } from "./normalize.js";

export interface AdapterOutput {
  path: string;
  content: string;
  kind?: "file" | "region";
}

export interface CompiledAgentTarget {
  agentRecords: AgentLockRecord[];
  outputs: Map<string, AdapterOutput[]>;
  fragmentMap: Map<string, { body: string; hash: string; bytes: number; tags: string[] }>;
}

export interface AgentDefinitionsTarget {
  kind: "agent-definitions";
  agents: string[] | "*";
  platforms: string[];
  outputPaths?: Record<string, string>;
}

export async function compileAgentDefinitionsTarget(
  target: AgentDefinitionsTarget,
  config: AgentQuiltConfig,
  sourceDir: string,
  repoRoot: string
): Promise<CompiledAgentTarget> {
  // Resolve agent list
  const records = resolveAgents(target.agents, sourceDir, repoRoot);

  // Hash agents and collect outputs
  const agentLockRecords: AgentLockRecord[] = [];
  const allOutputs = new Map<string, AdapterOutput[]>();
  const allFragmentMap = new Map<string, { body: string; hash: string; bytes: number; tags: string[] }>();

  for (const record of records) {
    const { bodyHash, metaHash, fragmentMap } = hashAgent(record);

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
        // Hash the output content
        const outHash = fragmentHash(normalize(Buffer.from(out.content, "utf8")));
        adapterOutputsByPlatform.push({ ...out, content: out.content, platform }); // Store platform for later
        outputs.push({
          platform,
          path: out.path,
          kind: out.kind ?? "file",
          hash: outHash,
        });
        outputEntries.push({
          platform,
          adapterVersion: adapter.ADAPTER_VERSION,
          outputHash: outHash,
        });
      }
    }

    // Finalize agent version with output entries
    const finalVersion = computeAgentVersion(record.name, bodyHash, metaHash, outputEntries);

    // Prepend HTML comment header to adapter outputs (except Claude, which needs clean YAML start for discovery)
    for (const out of adapterOutputsByPlatform) {
      // Claude Code agents must start with --- for agent discovery; skip HTML comment for claude adapter
      if (out.platform !== "claude") {
        const header = `<!-- agentquilt: generated file — do not edit. version=${finalVersion} · regenerate: npx agentquilt build -->\n`;
        out.content = `${header}${out.content}`;
      }
      // For Claude adapter, content starts directly with --- (YAML frontmatter)
    }

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
  };
}
