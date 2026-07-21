import { readdirSync, existsSync, readFileSync, realpathSync } from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import type { AgentQuiltConfig } from "../schemas/config.schema.js";
import { byteCompare } from "./sortUtil.js";
import { assertPathContained } from "./pathSecurity.js";

export interface DiscoveredFragment {
  id: string;              // POSIX path: agents/_shared/010-tone.md
  filePath: string;        // absolute path
  agentName: string;       // e.g., "_shared", "backend"
  fileName: string;        // e.g., "010-tone.md"
  namePrefix: string;      // "010" or ""
  hasPrefix: boolean;
  tags: string[];
}

/**
 * Extract front-matter tags from raw file content.
 * Returns { tags, body } where tags are from YAML front-matter.
 */
function extractFrontmatterTags(rawBytes: Buffer): string[] {
  try {
    let text = rawBytes.toString("utf8");

    // Strip BOM if present
    const BOM = "﻿";
    if (text.startsWith(BOM)) {
      text = text.slice(1);
    }

    // Match YAML front-matter block
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = text.match(frontmatterRegex);

    if (!match) {
      return [];
    }

    const yaml = parseYaml(match[1]);
    if (yaml && typeof yaml === "object" && "tags" in yaml) {
      const tags = yaml.tags;
      return Array.isArray(tags) ? tags.map(String) : [];
    }

    return [];
  } catch {
    // If YAML parsing fails, just return empty tags
    return [];
  }
}

/**
 * Parse filename to extract ordering prefix.
 * Returns { prefix: "010", hasPrefix: true } or { prefix: "", hasPrefix: false }
 */
function parseFilePrefix(filename: string): { prefix: string; hasPrefix: boolean } {
  const match = filename.match(/^(\d{3})-/);
  if (match) {
    return { prefix: match[1], hasPrefix: true };
  }
  return { prefix: "", hasPrefix: false };
}

/**
 * Byte-lex sort fragments: prefixed first (by numeric prefix), then unprefixed.
 * NO localeCompare() — use byte comparison only.
 */
function sortFragmentsBytelex(frags: DiscoveredFragment[]): DiscoveredFragment[] {
  return [...frags].sort((a, b) => {
    // Both have prefix: sort by filename
    if (a.hasPrefix && b.hasPrefix) {
      return byteCompare(a.fileName, b.fileName);
    }

    // a has prefix, b doesn't: a comes first
    if (a.hasPrefix && !b.hasPrefix) {
      return -1;
    }

    // a doesn't have prefix, b does: b comes first
    if (!a.hasPrefix && b.hasPrefix) {
      return 1;
    }

    // Both unprefixed: sort lexicographically by filename
    return byteCompare(a.fileName, b.fileName);
  });
}

/**
 * Scan all fragments in a config's include list.
 * Returns flat list of discovered fragments (not grouped).
 */
export function scanFragments(
  config: AgentQuiltConfig,
  sourceDir: string
): DiscoveredFragment[] {
  const allFragments: DiscoveredFragment[] = [];
  const seenIds = new Set<string>();
  const realSourceDir = realpathSync(sourceDir);

  // Scan each include in order (only for document targets)
  for (const includeName of new Set(
    config.targets
      .filter((t) => t.kind === "document")
      .flatMap((t) => ("include" in t) ? t.include : [])
  )) {
    const agentPath = path.join(sourceDir, includeName);

    // Skip if agent dir doesn't exist (already validated by configLoader, but be safe)
    if (!existsSync(agentPath)) {
      console.warn(`Warning: agent directory not found: ${agentPath}`);
      continue;
    }
    const realAgentPath = realpathSync(agentPath);
    assertPathContained(
      realAgentPath,
      realSourceDir,
      `Document include escapes sourceDir through a symlink: "${includeName}"`
    );

    // List all .md files
    let mdFiles: string[] = [];
    try {
      mdFiles = readdirSync(agentPath)
        .filter((f) => f.endsWith(".md"))
        .filter((f) => {
          // Check if it's a file (not directory)
          try {
            readdirSync(path.join(agentPath, f), { withFileTypes: true });
            return false; // If it's readable as a dir, skip
          } catch {
            return true; // It's a file
          }
        });
    } catch (err) {
      console.warn(
        `Warning: failed to scan agent directory ${agentPath}: ${err instanceof Error ? err.message : String(err)}`
      );
      continue;
    }

    // Sort by byte-lex within this include
    mdFiles.sort(byteCompare);

    // Process each file
    for (const fileName of mdFiles) {
      const filePath = path.join(agentPath, fileName);
      assertPathContained(
        realpathSync(filePath),
        realAgentPath,
        `Document fragment escapes its include directory through a symlink: ${filePath}`
      );
      const id = path.relative(sourceDir, filePath).replace(/\\/g, "/");

      // Warn on unprefixed files
      const { prefix, hasPrefix } = parseFilePrefix(fileName);
      if (!hasPrefix) {
        console.warn(`Warning: fragment has no prefix: ${id}`);
      }

      // Skip duplicates (shouldn't happen, but be safe)
      if (seenIds.has(id)) {
        console.warn(`Warning: duplicate fragment (skipping): ${id}`);
        continue;
      }

      // Read and extract tags
      let tags: string[] = [];
      try {
        const raw = readFileSync(filePath);
        tags = extractFrontmatterTags(raw);
      } catch (err) {
        console.warn(
          `Warning: failed to read fragment ${id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      allFragments.push({
        id,
        filePath,
        agentName: includeName,
        fileName,
        namePrefix: prefix,
        hasPrefix,
        tags,
      });

      seenIds.add(id);
    }
  }

  return sortFragmentsBytelex(allFragments);
}

/**
 * Get fragments for a specific target (in resolution order).
 */
export function getFragmentsForTarget(
  allFragments: DiscoveredFragment[],
  config: AgentQuiltConfig,
  targetIndex: number
): DiscoveredFragment[] {
  const target = config.targets[targetIndex];
  if (!target || target.kind !== "document") return [];

  const result: DiscoveredFragment[] = [];

  // For each include in order
  for (const includeName of ("include" in target) ? target.include : []) {
    // Get all fragments from this agent (they're already sorted in allFragments)
    const agentFrags = allFragments.filter((f) => f.agentName === includeName);
    result.push(...agentFrags);
  }

  return result;
}
