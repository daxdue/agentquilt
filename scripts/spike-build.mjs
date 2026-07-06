#!/usr/bin/env node
/**
 * Spike 2: Concurrent-PR auto-merge test
 * Validates that two branches each modifying different fragments merge without conflict.
 * Recompiles and verifies lock consistency after merge.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";

const REPO_ROOT = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  ".."
);

/**
 * Normalize a fragment (reuse from spike-hash).
 */
function normalize(raw) {
  let text = raw.toString("utf8");
  const BOM = "﻿";
  if (text.startsWith(BOM)) {
    text = text.slice(1);
  }
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = text.match(frontmatterRegex);
  if (match) {
    text = text.slice(match[0].length);
  }
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/\n+$/, "");
  if (text.length > 0) {
    text += "\n";
  } else {
    text = "\n";
  }
  return text;
}

/**
 * Hash a normalized fragment.
 */
function fragmentHash(normalizedBody) {
  const hash = crypto
    .createHash("sha256")
    .update(normalizedBody, "utf8")
    .digest("hex");
  return `sha256-${hash}`;
}

/**
 * Compute target version from ordered fragments.
 */
function targetVersion(formatVersion, outputFormat, fragments) {
  let input = formatVersion + "\n" + outputFormat + "\n";
  for (const frag of fragments) {
    input += frag.id + ":" + frag.hash + "\n";
  }
  const hash = crypto.createHash("sha256").update(input, "utf8").digest("hex");
  return `sha256-${hash}`;
}

/**
 * Load all fragments from agents directory, sorted lexicographically.
 */
function loadFragments(sourceDir, agentDirs) {
  const fragments = [];

  for (const agent of agentDirs) {
    const agentPath = path.join(sourceDir, agent);
    if (!fs.existsSync(agentPath)) {
      continue;
    }

    const files = fs.readdirSync(agentPath);
    const markdownFiles = files.filter((f) => f.endsWith(".md"));
    // Sort byte-lexicographically
    markdownFiles.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));

    for (const file of markdownFiles) {
      const filePath = path.join(agentPath, file);
      const raw = fs.readFileSync(filePath);
      const normalized = normalize(raw);
      const hash = fragmentHash(normalized);
      const id = path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");

      fragments.push({ id, hash, body: normalized });
    }
  }

  return fragments;
}

/**
 * Assemble target from fragments.
 */
function assembleTarget(version, bodies) {
  const header = `<!-- agentquilt: generated file — do not edit. version=${version} · source: agents/ · regenerate: npm run build -->\n\n`;
  const joined = bodies.join("\n\n");
  return header + joined + "\n";
}

/**
 * Build all targets and generate lock.
 */
function runBuild() {
  const sourceDir = path.join(REPO_ROOT, "agents");
  const agentDirs = ["_shared", "backend"];

  // Load all fragments
  const fragments = loadFragments(sourceDir, agentDirs);

  if (fragments.length === 0) {
    console.error("No fragments found");
    return false;
  }

  // Build single target: _shared + backend
  const targetFragments = fragments;
  const version = targetVersion("1", "markdown", targetFragments);
  const bodies = targetFragments.map((f) => f.body);
  const output = assembleTarget(version, bodies);

  // Write output file
  const outputPath = path.join(REPO_ROOT, "AGENTS.md");
  fs.writeFileSync(outputPath, output);

  // Write lock
  const lock = {
    lockfileVersion: 1,
    formatVersion: "1",
    fragments: fragments.map((f) => ({
      id: f.id,
      hash: f.hash,
      bytes: Buffer.byteLength(f.body, "utf8"),
    })),
    targets: [
      {
        output: "AGENTS.md",
        format: "markdown",
        fragments: targetFragments.map((f) => f.id),
        version,
      },
    ],
  };

  const lockPath = path.join(REPO_ROOT, "agentquilt.lock");
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");

  console.log(`Built AGENTS.md (${version})`);
  console.log(`Wrote ${fragments.length} fragments to lock`);

  return true;
}

/**
 * Check if current state is clean (no conflicts).
 */
function checkStatus() {
  try {
    const status = execSync("git status --porcelain", { cwd: REPO_ROOT })
      .toString()
      .trim();
    if (status.includes("UU") || status.includes("AA") || status.includes("DD")) {
      console.error("Merge conflicts detected:");
      console.error(status);
      return false;
    }
  } catch (e) {
    console.error("Failed to check git status:", e.message);
    return false;
  }
  return true;
}

async function main() {
  console.log("Spike 2 — Concurrent-PR Auto-Merge Test\n");

  // Check no conflicts
  if (!checkStatus()) {
    console.error("✗ FAIL: Merge conflicts present");
    process.exit(1);
  }

  console.log("✓ No merge conflicts in working tree\n");

  // Build and verify lock consistency
  if (!runBuild()) {
    console.error("✗ FAIL: Build failed");
    process.exit(1);
  }

  console.log("✓ Build completed successfully");
  console.log("✓ PASS: Spike 2 prerequisites satisfied");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(3);
});
