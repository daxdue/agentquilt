#!/usr/bin/env node
/**
 * Publish gate for the VS Code extension (development infrastructure only).
 *
 * Compares packages/vscode-extension/package.json's `version` field between
 * HEAD^ and HEAD. The extension has no changesets-driven release flow (it's
 * excluded from .changeset/config.json's ignore list on purpose); a manual
 * version bump in the merged commit is the human decision that marks a
 * change publish-worthy, same spirit as changesets' own "add a changeset"
 * signal for the CLI package. CI never decides whether to publish - it only
 * checks whether a human already did, by writing GITHUB_OUTPUT `changed`.
 *
 * Exit 0 always - this script is informational (the workflow's `if:`
 * consumes the output), not a pass/fail gate itself.
 */
import { execSync } from "child_process";
import { readFileSync, appendFileSync } from "fs";

const PACKAGE_JSON_PATH = "packages/vscode-extension/package.json";

function readVersionAt(ref) {
  try {
    const raw = execSync(`git show ${ref}:${PACKAGE_JSON_PATH}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(raw).version;
  } catch {
    return null; // file didn't exist at that ref (e.g. the commit that added it)
  }
}

const previousVersion = readVersionAt("HEAD^");
const currentVersion = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")).version;
const changed = previousVersion !== currentVersion;

console.log(
  `packages/vscode-extension version: previous=${previousVersion ?? "(none)"} current=${currentVersion} changed=${changed}`
);

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(githubOutput, `changed=${changed}\n`);
}

process.exit(0);
