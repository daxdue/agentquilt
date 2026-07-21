import type { CanonicalAgentRecord } from "../agentLoader.js";
import type { ResolvedModel } from "../modelResolver.js";
import type { AgentQuiltConfig } from "../../schemas/config.schema.js";

export interface AdapterOutput {
  path: string;     // repo-relative path for the output file
  content: string;  // full file content
  kind?: "file";     // default "file"; the only kind any adapter emits (ADR-0015 rejected managed-region injection)
}

export interface Adapter {
  readonly id: string;
  readonly ADAPTER_VERSION: string;
  outputsFor(
    record: CanonicalAgentRecord,
    resolvedModel: ResolvedModel,
    config: AgentQuiltConfig
  ): AdapterOutput[];
}

// Adapter registry
const ADAPTERS = new Map<string, Adapter>();

export function registerAdapter(adapter: Adapter): void {
  ADAPTERS.set(adapter.id, adapter);
}

export function getAdapter(id: string): Adapter | undefined {
  return ADAPTERS.get(id);
}

export function knownAdapters(): string[] {
  return Array.from(ADAPTERS.keys());
}
