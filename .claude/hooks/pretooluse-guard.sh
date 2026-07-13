#!/bin/sh
# Claude Code PreToolUse guard hook (Phase 6, design decision D2).
#
# Purpose (documented per ADR-0012 point 7's hook-necessity bar):
#   D2: enforce a per-agent_type Bash command allow-list for exactly four
#   read-only/investigation-only subagents (repository-analyst,
#   regression-reviewer, deterministic-output, supply-chain-risk), closing
#   Phase 4's D5 residual risk mechanically. permissions.deny in
#   settings.json cannot express "only when this agent_type is the caller";
#   a PreToolUse hook reading agent_type is the documented workaround.
#
# D6 (the secret-adjacent filename deny) is implemented separately, as a
# native permissions.deny extension in settings.json (Read/Edit/Write rules
# for .env, .env.*, *.pem, *.key, id_rsa*) rather than in this hook: Claude
# Code's Edit/Read/Write deny rules follow gitignore semantics where a bare
# filename pattern matches at any depth (confirmed against current
# documentation immediately before writing this file), which is a native
# rule fully expressing D6's intent -- no hook is needed for it, matching
# the phase doc's own "native permission rules first" preference order.
# This hook is therefore scoped to D2 only, the one guardrail that a native
# rule genuinely cannot express (no per-caller dimension in permissions.deny
# matchers).
#
# This script is a fixed-table/fixed-pattern lookup only. It makes no
# network or model calls, mutates no file, and is development-only (it
# governs this repository's own Claude Code sessions; it is not shipped
# product code and is not read by the AgentQuilt compiler).
#
# Exit 0 with no stdout: no opinion, normal permission flow applies
#   (existing settings.json permissions.deny/allow and any settings.local.json
#   allow list remain the authority for that call).
# Exit 0 with a JSON permissionDecision:"deny" payload on stdout: blocks the
#   call, with a reason surfaced to the caller.
#
# Requires: jq (already a assumed-present developer tool; if jq is missing,
# fail open -- exit 0, no opinion -- rather than block all tool use on a
# missing dependency).

set -eu

INPUT="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  # Fail open: no jq means this hook cannot evaluate anything. Do not block
  # legitimate development on a missing local tool; the existing
  # permissions.deny block in settings.json still applies independently.
  exit 0
fi

TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')"
AGENT_TYPE="$(printf '%s' "$INPUT" | jq -r '.agent_type // empty')"

deny() {
  reason="$1"
  jq -n --arg reason "$reason" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'
  exit 0
}

# --- D2: per-agent_type Bash command allow-list, four scoped agents only ---
# Every other agent_type (including empty/main session, feature-implementer,
# test-engineer, and all other agents) passes through untouched: this hook
# adds a narrower restriction on top of the existing global
# permissions.deny, it never widens access.
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"

  # Fixed per-agent allow-list, mirroring each agent's own documented
  # command grant (agent-portfolio.md section 6; the compiled bodies of
  # .claude/agents/repository-analyst.md, regression-reviewer.md,
  # deterministic-output.md, supply-chain-risk.md). Matched as a command
  # PREFIX check against the first word(s) of the command string -- this is
  # a simple fixed-table lookup, not a general parser: a caller could still
  # chain commands with && or ; to smuggle a denied command after an
  # allowed prefix, which is a known limitation of this narrow mechanism
  # (documented in the phase report, not silently assumed away).
  case "$AGENT_TYPE" in
    repository-analyst)
      case "$COMMAND" in
        "git log"*|"git show"*|"git blame"*|"git diff"*|"git ls-tree"*|"git status"*) ;;
        *) deny "Blocked by D2 per-agent guard: repository-analyst may only run read-only git commands (git log, git show, git blame, git diff, git ls-tree, git status). Command was: $COMMAND" ;;
      esac
      ;;
    regression-reviewer)
      case "$COMMAND" in
        "npm test"*|"npm run build"*|"npx agentquilt check"*|"git log"*|"git show"*|"git blame"*|"git diff"*|"git ls-tree"*|"git status"*) ;;
        *) deny "Blocked by D2 per-agent guard: regression-reviewer may only run npm test, npm run build, npx agentquilt check, and read-only git commands. Command was: $COMMAND" ;;
      esac
      ;;
    deterministic-output)
      case "$COMMAND" in
        "npm test"*|"npx agentquilt check"*|"git log"*|"git show"*|"git blame"*|"git diff"*|"git ls-tree"*|"git status"*) ;;
        *) deny "Blocked by D2 per-agent guard: deterministic-output may only run npm test, npx agentquilt check, and read-only git commands. Command was: $COMMAND" ;;
      esac
      ;;
    supply-chain-risk)
      case "$COMMAND" in
        "npm ls"*|"npm view"*|"npm audit"*|"git log"*|"git show"*|"git blame"*|"git diff"*|"git ls-tree"*|"git status"*) ;;
        *) deny "Blocked by D2 per-agent guard: supply-chain-risk may only run read-only npm queries (npm ls, npm view, npm audit) and read-only git commands. Command was: $COMMAND" ;;
      esac
      ;;
    *)
      # Not one of the four scoped agents (including the main session and
      # every other agent_type): no opinion from this hook.
      ;;
  esac
fi

exit 0
