#!/usr/bin/env node
/**
 * Spike 1: Hash determinism across OSes
 * Implements §3.1 normalization algorithm and sha256 hashing.
 * Test that the same fragment content produces identical sha256-<hex> on all platforms.
 */

import fs from "fs";
import crypto from "crypto";
import path from "path";

/**
 * Implements §3.1 normalization algorithm.
 *
 * Given raw file bytes, produce the normalized body:
 * 1. Decode as UTF-8. Strip a leading UTF-8 BOM if present.
 * 2. If content begins with YAML front-matter (---\n…\n---\n), remove it.
 * 3. Replace \r\n and lone \r with \n.
 * 4. Trim trailing newlines and blank lines, then append exactly one \n.
 * 5. Do NOT alter inline trailing whitespace (Markdown hard line-break).
 */
function normalize(raw) {
  // Step 1: Decode UTF-8, strip BOM
  let text = raw.toString("utf8");
  const BOM = "﻿";
  if (text.startsWith(BOM)) {
    text = text.slice(1);
  }

  // Step 2: Strip YAML front-matter if present
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = text.match(frontmatterRegex);
  if (match) {
    text = text.slice(match[0].length);
  }

  // Step 3: Replace all line endings with \n
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Step 4: Trim trailing newlines/blank lines, append exactly one \n
  // Trim all trailing whitespace (newlines and blank lines) from the end
  text = text.replace(/\n+$/, "");
  // Append exactly one newline
  if (text.length > 0) {
    text += "\n";
  } else {
    text = "\n";
  }

  return text;
}

/**
 * Compute fragment hash: sha256(normalized body as UTF-8), formatted as sha256-<hex>.
 */
function fragmentHash(normalizedBody) {
  const hash = crypto
    .createHash("sha256")
    .update(normalizedBody, "utf8")
    .digest("hex");
  return `sha256-${hash}`;
}

/**
 * Main: Read fixtures, normalize, hash, and assert all are identical.
 */
async function main() {
  const fixturesDir = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "fixtures"
  );

  const files = ["plain.md", "crlf.md", "bom-crlf.md"];
  const results = [];

  console.log("Spike 1 — Hash Determinism Across OSes\n");

  for (const file of files) {
    const filePath = path.join(fixturesDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`✗ Fixture not found: ${filePath}`);
      process.exit(1);
    }

    const raw = fs.readFileSync(filePath);
    const normalized = normalize(raw);
    const hash = fragmentHash(normalized);

    results.push({ file, hash });
    console.log(`${file}: ${hash}`);
  }

  console.log();

  // Check all hashes are identical
  const firstHash = results[0].hash;
  const allIdentical = results.every((r) => r.hash === firstHash);

  if (allIdentical) {
    console.log(`✓ PASS: All three fixtures produce identical hash`);
    console.log(`  Hash: ${firstHash}`);
    process.exit(0);
  } else {
    console.error("✗ FAIL: Hashes differ across fixtures");
    console.error("Expected all to be identical:");
    results.forEach((r) => console.error(`  ${r.file}: ${r.hash}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(3);
});
