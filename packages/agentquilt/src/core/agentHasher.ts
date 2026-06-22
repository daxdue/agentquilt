import { createHash } from "crypto";
import { readFileSync } from "fs";
import { normalize, fragmentHash, targetVersion, type FragmentRef } from "./normalize.js";
import { CanonicalAgentRecord, BodyFragment } from "./agentLoader.js";

export interface OutputEntry {
  platform: string;
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

function sortKeysDeep(obj: Record<string, unknown>): Record<string, unknown> {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return obj as Record<string, unknown>;
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)))) {
    const val = obj[key];
    sorted[key] =
      typeof val === "object" && val !== null && !Array.isArray(val)
        ? sortKeysDeep(val as Record<string, unknown>)
        : val;
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
  const sorted = [...outputEntries].sort((a, b) =>
    Buffer.from(a.platform).compare(Buffer.from(b.platform))
  );
  const outputLines = sorted
    .map((e) => `${e.platform}:${e.adapterVersion}:${e.outputHash}`)
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
