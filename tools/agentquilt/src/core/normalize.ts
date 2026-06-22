import { createHash } from "crypto";

/**
 * Normalize a fragment according to v1 spec §3.1.
 *
 * Given raw file bytes, produce the normalized body:
 * 1. Decode as UTF-8. Strip a leading UTF-8 BOM if present.
 * 2. Replace \r\n and lone \r with \n. (Before front-matter detection to handle ---\r\n correctly)
 * 3. If content begins with YAML front-matter (---\n…\n---\n), remove it.
 * 4. Trim trailing newlines and blank lines, then append exactly one \n.
 * 5. Do NOT alter inline trailing whitespace (Markdown hard line-breaks).
 *
 * Note: Steps 2 and 3 are swapped from the spec to correctly handle CRLF+front-matter edge case.
 * The external result is identical for all well-formed inputs.
 */
export function normalize(rawBytes: Buffer): string {
  // Step 1: Decode UTF-8, strip BOM
  let text = rawBytes.toString("utf8");
  const BOM = "﻿"; // UTF-8 BOM as string
  if (text.startsWith(BOM)) {
    text = text.slice(1);
  }

  // Step 2 (reordered): Replace all line endings with \n
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Step 3: Strip YAML front-matter if present (---\n…\n---\n)
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = text.match(frontmatterRegex);
  if (match) {
    text = text.slice(match[0].length);
  }

  // Step 4: Trim trailing blank lines, append exactly one \n
  // Remove all trailing newlines first
  text = text.replace(/\n+$/, "");
  // Append exactly one newline (even for empty body)
  text = text.length > 0 ? text + "\n" : "\n";

  return text;
}

/**
 * Compute fragment hash: sha256(normalized body as UTF-8), formatted as "sha256-<hex>".
 */
export function fragmentHash(normalizedBody: string): string {
  const hash = createHash("sha256")
    .update(normalizedBody, "utf8")
    .digest("hex");
  return `sha256-${hash}`;
}

/**
 * Fragment record for target version computation.
 */
export interface FragmentRef {
  id: string;
  hash: string;
}

/**
 * Compute target version: Merkle root over ordered fragments.
 * Input = FORMAT_VERSION + "\n" + OUTPUT_FORMAT + "\n" + (id:hash\n × each fragment)
 * Output = "sha256-<hex>"
 */
export function targetVersion(
  formatVersion: string,
  outputFormat: string,
  fragments: FragmentRef[]
): string {
  let input = formatVersion + "\n" + outputFormat + "\n";
  for (const frag of fragments) {
    input += frag.id + ":" + frag.hash + "\n";
  }
  const hash = createHash("sha256").update(input, "utf8").digest("hex");
  return `sha256-${hash}`;
}
