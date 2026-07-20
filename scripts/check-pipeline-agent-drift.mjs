#!/usr/bin/env node
/**
 * Pipeline agent drift check (development infrastructure only).
 *
 * Compares the two hand-maintained agent rosters used by this repository's
 * agentic-SDLC pipeline: .agentquilt/agents/<name>/ (compiled by AgentQuilt
 * into .claude/agents/<name>.md) and .codex/agents/<name>.toml
 * (hand-authored, untouched by any compiler). Both describe the same 14 dev
 * roles but are maintained independently -- see
 * .docs/agentic-sdlc/codex-pipeline.md section on D2 for why they are not
 * unified via a compiler adapter (ADR-0012 point 2: the compiler and
 * adapters are not extended for the pipeline's sake).
 *
 * This script does not read or write anything under packages/agentquilt-cli
 * and does not affect product behavior; it is development-only tooling, the
 * same category as scripts/spike-*.mjs.
 *
 * Checks two classes of drift:
 *   1. Roster parity -- every agent on one side has a counterpart on the
 *      other, except documented, intentional exceptions.
 *   2. Permission parity -- for matched pairs, agent.yaml's `permissions`
 *      and the .toml's `sandbox_mode` map to consistent capability levels,
 *      except documented, intentional exceptions.
 *
 * Exit 0 if clean, 1 if any check fails (matches `agentquilt check`'s own
 * exit-code convention).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const CLAUDE_AGENTS_DIR = path.join(REPO_ROOT, ".agentquilt", "agents");
const CODEX_AGENTS_DIR = path.join(REPO_ROOT, ".codex", "agents");

// Name differences that are intentional and already documented -- not drift.
// { claudeName: codexName }
const KNOWN_ALIASES = {
  // Same role (agent-portfolio.md 6.1), renamed on the Codex side; see
  // repository-explorer.toml's own "Maps to agent-portfolio.md 6.1
  // repository-analyst" line.
  "repository-analyst": "repository-explorer",
};

// Agents that exist on only one side, deliberately, with no counterpart
// expected on the other -- not drift.
const CLAUDE_ONLY_EXCEPTIONS = new Set([
  // Codex's test-reviewer is NOT this agent's counterpart: it is a
  // deliberately narrower, read-only-only slice of the same
  // agent-portfolio.md 6.4 role, split out because Codex has no documented
  // way to attach a custom permission profile per agent (Phase 5 design
  // decision D5). See test-reviewer.toml's own description field.
  "test-engineer",
]);
const CODEX_ONLY_EXCEPTIONS = new Set([
  // See CLAUDE_ONLY_EXCEPTIONS note above -- the other half of the same
  // documented D5 split.
  "test-reviewer",
]);

// Coarse manifest `permissions` -> expected Codex `sandbox_mode`.
const PERMISSION_MAP = {
  "read-only": "read-only",
  workspace: "workspace-write",
  full: "danger-full-access",
};

// Matched pairs (by claude name, post-alias) where the mapped permission is
// known and deliberately NOT expected to match -- not drift. Both agents
// carry a "RESIDUAL-RISK NOTICE" in their own .codex/agents/*.toml file
// explaining this: Codex's sandbox_mode has no per-agent custom-profile
// attachment mechanism (Phase 5 design decision D1), so these two agents
// are workspace-write on Codex (restricted only by developer_instructions
// text) while remaining read-only + a Bash grant restricted by the Phase 6
// D2 hook's per-agent-type allow-list on Claude Code.
const KNOWN_PERMISSION_EXCEPTIONS = new Set([
  "deterministic-output",
  "regression-reviewer",
]);

function readClaudeAgents() {
  const agents = new Map();
  for (const dirName of fs.readdirSync(CLAUDE_AGENTS_DIR)) {
    if (dirName === "project") continue;
    const manifestPath = path.join(CLAUDE_AGENTS_DIR, dirName, "agent.yaml");
    if (!fs.existsSync(manifestPath)) continue;
    const raw = fs.readFileSync(manifestPath, "utf8");
    const permMatch = raw.match(/^permissions:\s*(\S+)\s*$/m);
    agents.set(dirName, {
      name: dirName,
      permissions: permMatch ? permMatch[1] : "read-only",
      path: manifestPath,
    });
  }
  return agents;
}

function readCodexAgents() {
  const agents = new Map();
  for (const fileName of fs.readdirSync(CODEX_AGENTS_DIR)) {
    if (!fileName.endsWith(".toml")) continue;
    const name = fileName.slice(0, -".toml".length);
    const filePath = path.join(CODEX_AGENTS_DIR, fileName);
    const raw = fs.readFileSync(filePath, "utf8");
    const sandboxMatch = raw.match(/^sandbox_mode\s*=\s*"([^"]+)"\s*$/m);
    agents.set(name, {
      name,
      sandbox_mode: sandboxMatch ? sandboxMatch[1] : null,
      path: filePath,
    });
  }
  return agents;
}

function main() {
  const claudeAgents = readClaudeAgents();
  const codexAgents = readCodexAgents();
  const failures = [];
  let pairsChecked = 0;

  // --- Roster parity ---
  for (const [claudeName, claudeAgent] of claudeAgents) {
    if (CLAUDE_ONLY_EXCEPTIONS.has(claudeName)) continue;
    const expectedCodexName = KNOWN_ALIASES[claudeName] ?? claudeName;
    if (!codexAgents.has(expectedCodexName)) {
      failures.push(
        `Roster parity: ${claudeAgent.path} has no Codex counterpart ` +
          `(expected .codex/agents/${expectedCodexName}.toml to exist). ` +
          `If this is intentional, add "${claudeName}" to ` +
          `CLAUDE_ONLY_EXCEPTIONS (or KNOWN_ALIASES) with a comment ` +
          `explaining why.`
      );
    }
  }

  const reverseAliases = Object.fromEntries(
    Object.entries(KNOWN_ALIASES).map(([c, x]) => [x, c])
  );
  for (const [codexName, codexAgent] of codexAgents) {
    if (CODEX_ONLY_EXCEPTIONS.has(codexName)) continue;
    const expectedClaudeName = reverseAliases[codexName] ?? codexName;
    if (!claudeAgents.has(expectedClaudeName)) {
      failures.push(
        `Roster parity: ${codexAgent.path} has no Claude Code counterpart ` +
          `(expected .agentquilt/agents/${expectedClaudeName}/agent.yaml to ` +
          `exist). If this is intentional, add "${codexName}" to ` +
          `CODEX_ONLY_EXCEPTIONS (or KNOWN_ALIASES) with a comment ` +
          `explaining why.`
      );
    }
  }

  // --- Permission parity, for matched pairs only ---
  for (const [claudeName, claudeAgent] of claudeAgents) {
    if (CLAUDE_ONLY_EXCEPTIONS.has(claudeName)) continue;
    const codexName = KNOWN_ALIASES[claudeName] ?? claudeName;
    const codexAgent = codexAgents.get(codexName);
    if (!codexAgent) continue; // already reported above

    pairsChecked += 1;
    if (KNOWN_PERMISSION_EXCEPTIONS.has(claudeName)) continue;

    const expectedSandboxMode = PERMISSION_MAP[claudeAgent.permissions];
    if (!expectedSandboxMode) {
      failures.push(
        `Permission parity: ${claudeAgent.path} has unrecognized ` +
          `permissions value "${claudeAgent.permissions}" -- update ` +
          `PERMISSION_MAP in this script.`
      );
      continue;
    }
    if (codexAgent.sandbox_mode !== expectedSandboxMode) {
      failures.push(
        `Permission parity: ${claudeName} is permissions: ` +
          `"${claudeAgent.permissions}" in ${claudeAgent.path} (expects ` +
          `sandbox_mode "${expectedSandboxMode}") but ${codexAgent.path} ` +
          `has sandbox_mode "${codexAgent.sandbox_mode}". If this is ` +
          `intentional (e.g. a documented residual-risk exception), add ` +
          `"${claudeName}" to KNOWN_PERMISSION_EXCEPTIONS with a comment ` +
          `explaining why.`
      );
    }
  }

  if (failures.length === 0) {
    console.log(
      `[OK] Pipeline agent drift check passed: ${claudeAgents.size} Claude ` +
        `Code agents, ${codexAgents.size} Codex agents, ${pairsChecked} ` +
        `matched pairs checked for permission parity, 0 drift findings.`
    );
    process.exit(0);
  }

  console.error(
    `[FAIL] Pipeline agent drift check found ${failures.length} issue(s):\n`
  );
  for (const failure of failures) {
    console.error(`  - ${failure}\n`);
  }
  process.exit(1);
}

main();
