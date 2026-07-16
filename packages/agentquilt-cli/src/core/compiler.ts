import { readFileSync } from "fs";
import { normalize, fragmentHash, targetVersion, type FragmentRef } from "./normalize.js";
import { scanFragments, getFragmentsForTarget } from "./fragmentScanner.js";
import type { AgentQuiltConfig } from "../schemas/config.schema.js";

export interface CompiledTarget {
  output: string;
  format: string;
  content: string;              // assembled Markdown
  version: string;              // sha256-...
  fragmentIds: string[];        // in resolution order
}

export interface CompileResult {
  targets: CompiledTarget[];
  fragmentMap: Map<string, { body: string; hash: string; bytes: number; tags: string[] }>;
}

/**
 * Generate HTML comment header per v1 spec §4.2.
 */
function generateHeader(targetVersion: string, sourceLabel: string): string {
  return `<!-- agentquilt: generated file — do not edit. version=${targetVersion} · source: ${sourceLabel} · regenerate: agentquilt build -->\n`;
}

/**
 * Assemble a target from normalized fragment bodies.
 */
function assembleTarget(
  normalizedBodies: Map<string, string>,
  fragmentIds: string[],
  targetVersion: string,
  sourceLabel: string
): string {
  const header = generateHeader(targetVersion, sourceLabel);
  const bodies = fragmentIds.map((id) => normalizedBodies.get(id)!);
  const joined = bodies.join("\n"); // join with blank line between bodies
  return header + "\n" + joined;
}

/**
 * Main compiler: orchestrate fragment discovery, normalization, hashing, and assembly.
 */
export async function compile(
  config: AgentQuiltConfig,
  sourceDir: string
): Promise<CompileResult> {
  // Scan all fragments
  const allFragments = scanFragments(config, sourceDir);

  // Header names the configured source, normalized to a trailing slash.
  const sourceLabel = config.sourceDir.replace(/\/+$/, "") + "/";

  // Build fragment map: id -> { body, hash, bytes, tags }
  const fragmentMap = new Map<string, { body: string; hash: string; bytes: number; tags: string[] }>();
  const normalizedBodies = new Map<string, string>();

  for (const frag of allFragments) {
    const raw = readFileSync(frag.filePath);
    const body = normalize(raw);
    const hash = fragmentHash(body);
    const bytes = Buffer.byteLength(body, "utf8");

    fragmentMap.set(frag.id, {
      body,
      hash,
      bytes,
      tags: frag.tags,
    });

    normalizedBodies.set(frag.id, body);
  }

  // Compile each document target
  const compiledTargets: CompiledTarget[] = [];

  for (let i = 0; i < config.targets.length; i++) {
    const target = config.targets[i];

    // Skip non-document targets in Phase 2
    if (target.kind !== "document") continue;

    const targetFrags = getFragmentsForTarget(allFragments, config, i);
    const fragmentIds = targetFrags.map((f) => f.id);

    // Build fragment refs for version hashing
    const fragmentRefs: FragmentRef[] = fragmentIds.map((id) => ({
      id,
      hash: fragmentMap.get(id)!.hash,
    }));

    // Compute target version
    const version = targetVersion("1", target.format || "markdown", fragmentRefs);

    // Assemble content
    const content = assembleTarget(normalizedBodies, fragmentIds, version, sourceLabel);

    compiledTargets.push({
      output: target.output,
      format: target.format || "markdown",
      content,
      version,
      fragmentIds,
    });
  }

  return {
    targets: compiledTargets,
    fragmentMap,
  };
}
