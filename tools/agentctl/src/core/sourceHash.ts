import { createHash } from "crypto";
import { stringify } from "yaml";
import { canonicalizeText } from "../utils/format.js";
import type { AgentManifest, InstructionBlock } from "../schemas/index.js";

export function computeSourceHash(
  manifest: AgentManifest,
  blocks: InstructionBlock[]
): string {
  // Canonical representation: manifest YAML + sorted blocks YAML
  const manifestYaml = canonicalizeText(stringify(manifest));
  const sortedBlocks = sortBlocks(manifest, blocks);
  const blocksYaml = canonicalizeText(
    sortedBlocks.map((b) => stringify(b)).join("")
  );

  const combined = manifestYaml + blocksYaml;
  return createHash("sha256").update(combined).digest("hex");
}

function sortBlocks(
  manifest: AgentManifest,
  blocks: InstructionBlock[]
): InstructionBlock[] {
  // Sort by: section order → priority → block id (Unicode code point)
  // Do NOT use localeCompare()

  const sectionMap = new Map<string, number>();
  const entries = Object.entries(manifest.sections);
  entries.forEach(([_, section]) => {
    sectionMap.set(section.id, section.order);
  });

  const priorityMap: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  return [...blocks].sort((a, b) => {
    const sectionOrderA = sectionMap.get(a.section) ?? Infinity;
    const sectionOrderB = sectionMap.get(b.section) ?? Infinity;

    if (sectionOrderA !== sectionOrderB) {
      return sectionOrderA - sectionOrderB;
    }

    const priorityA = priorityMap[a.priority] ?? 0;
    const priorityB = priorityMap[b.priority] ?? 0;

    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }

    // Unicode code point comparison (no localeCompare)
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
