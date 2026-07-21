import { createHash } from "crypto";
import { readFileSync } from "fs";
import { normalize, fragmentHash, targetVersion, type FragmentRef } from "./normalize.js";
import { CanonicalAgentRecord, BodyFragment } from "./agentLoader.js";
import { byteCompare } from "./sortUtil.js";

export interface OutputEntry {
  platform: string;
  path: string;
  kind: "file";
  adapterVersion: string;
  outputHash: string;
}

export interface AgentHashResult {
  bodyHash: string;
  metaHash: string;
  agentVersion: string;
  fragmentMap: Map<string, { body: string; hash: string; bytes: number; tags: string[] }>;
}

export function computeBodyHash(bodyFragments: BodyFragment[]): string {
  const refs: FragmentRef[] = bodyFragments.map((f) => {
    const raw = readFileSync(f.filePath);
    const body = normalize(raw);
    const hash = fragmentHash(body);
    return { id: f.id, hash };
  });
  return targetVersion("1", "agent-body", refs);
}

export function computeMetaHash(definition: Record<string, unknown>): string {
  // Sort keys recursively and hash the stable JSON representation
  const sorted = sortKeysDeep(definition);
  const json = JSON.stringify(sorted);
  const hash = createHash("sha256").update(json, "utf8").digest("hex");
  return `sha256-${hash}`;
}

function sortKeysDeep(obj: unknown): unknown {
  // Recurse into arrays too, not just objects: an array of objects (e.g.
  // x-codex.skills.config) must have each element's keys canonicalized, or
  // two semantically identical manifests that only differ in per-element
  // key order would hash differently and falsely bump the agent version.
  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep);
  }
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort(byteCompare)) {
    sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

export function computeAgentVersion(
  name: string,
  bodyHash: string,
  metaHash: string,
  outputEntries: OutputEntry[] = []
): string {
  // Phase 3: Extended version with ADAPTER_VERSION + outputHashes
  const sorted = [...outputEntries].sort((a, b) => {
    for (const [left, right] of [
      [a.platform, b.platform],
      [a.path, b.path],
      [a.kind, b.kind],
      [a.adapterVersion, b.adapterVersion],
      [a.outputHash, b.outputHash],
    ]) {
      const order = byteCompare(left, right);
      if (order !== 0) return order;
    }
    return 0;
  });
  const outputLines = sorted
    .map((e) => `${e.platform}:${e.path}:${e.kind}:${e.adapterVersion}:${e.outputHash}`)
    .join("\n");
  const input = `1\nagent\n${name}\n${bodyHash}\n${metaHash}\n${outputLines}\n`;
  const hash = createHash("sha256").update(input, "utf8").digest("hex");
  return `sha256-${hash}`;
}

export function hashAgent(record: CanonicalAgentRecord): AgentHashResult {
  const bodyHash = computeBodyHash(record.bodyFragments);
  const metaHash = computeMetaHash(record.definition as Record<string, unknown>);
  const agentVersion = computeAgentVersion(record.name, bodyHash, metaHash);

  // Build fragment map for body fragments
  const fragmentMap = new Map<string, { body: string; hash: string; bytes: number; tags: string[] }>();
  for (const frag of record.bodyFragments) {
    const raw = readFileSync(frag.filePath);
    const body = normalize(raw);
    const hash = fragmentHash(body);
    const bytes = Buffer.byteLength(body, "utf8");
    fragmentMap.set(frag.id, { body, hash, bytes, tags: [] });
  }

  return { bodyHash, metaHash, agentVersion, fragmentMap };
}
