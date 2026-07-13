#!/bin/sh
# Codex PreToolUse guard hook (Phase 6, design decisions D1 and D6).
#
# Purpose (documented per ADR-0012 point 7's hook-necessity bar):
#   D1: deny apply_patch-style edits to the generated-file set (AGENTS.md,
#   CLAUDE.md, .claude/agents/**, agentquilt.lock) and Bash/exec matches
#   against the absolute-rule command set (git push, git tag, npm publish,
#   npm version, gh pr merge, gh release), closing the one guardrail where
#   Codex has no native declarative deny-list mechanism at all (unlike
#   Claude Code's committed permissions.deny block). This is the Codex-side
#   equivalent of that block.
#   D6: deny apply_patch edits against a narrow secret-adjacent filename set
#   (.env, .env.*, *.pem, *.key, id_rsa*), for every caller -- bundled into
#   this same hook.
#
# Known, documented limitation (re-verified immediately before writing this
# file): Codex's PreToolUse hook input has NO field identifying which
# custom agent triggered the call (unlike Claude Code's agent_type). This
# hook therefore applies globally to every caller -- main session and every
# spawned custom agent alike -- which is exactly the phase's intent for D1
# (a Claude-Code-permissions.deny equivalent is global by nature; it is not
# attempting the per-agent scoping that D2 achieves on the Claude Code side,
# because that specific mechanism does not exist on Codex, per the
# guardrails-design.md section 4.2 finding).
#
# Also documented: PreToolUse's "matcher" filters ONLY on tool_name
# (confirmed by direct query against current documentation immediately
# before writing this file). apply_patch's tool_input has no distinct,
# separately-documented file-path field -- the patch/diff text itself
# carries the target path (Codex's apply_patch format embeds paths in
# lines such as "*** Update File: <path>" / "*** Add File: <path>" /
# "*** Delete File: <path>"). This script therefore greps the raw
# tool_input JSON text for the generated-file and secret-filename patterns
# rather than trusting a specific structured field, since no such field is
# documented to exist. This is a fixed-pattern text match, not a parser or
# a policy engine.
#
# This script makes no network or model calls, mutates no file, and is
# development-only (it governs this repository's own Codex sessions; it is
# not shipped product code and is not read by the AgentQuilt compiler).
#
# Exit 0 with no stdout: no opinion, normal permission flow applies.
# Exit 0 with a JSON permissionDecision:"deny" payload on stdout: blocks
# the call, with a reason surfaced to the caller.
#
# Requires: jq. If jq is missing, fail open (exit 0, no opinion) rather
# than block all tool use on a missing local dependency.

set -eu

INPUT="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')"

deny() {
  reason="$1"
  jq -n --arg reason "$reason" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'
  exit 0
}

# --- D1 (generated-file set) + D6 (secret-adjacent filenames): apply_patch ---
if [ "$TOOL_NAME" = "apply_patch" ]; then
  PATCH_TEXT="$(printf '%s' "$INPUT" | jq -r '.tool_input | tostring')"

  for pattern in \
    'AGENTS\.md' \
    'CLAUDE\.md' \
    '\.claude/agents/' \
    'agentquilt\.lock'
  do
    if printf '%s' "$PATCH_TEXT" | grep -qE "$pattern"; then
      deny "Blocked by D1 generated-file guard: this apply_patch call appears to target a generated file (matched pattern: $pattern). Generated files (AGENTS.md, CLAUDE.md, .claude/agents/**, agentquilt.lock) are rebuild-only outputs; edit the source fragments under .agentquilt/ and run 'npx agentquilt build' instead."
    fi
  done

  for pattern in \
    '(^|[/[:space:]])\.env([/[:space:]"\\]|$)' \
    '\.env\.[A-Za-z0-9_-]' \
    '\.pem([/[:space:]"\\]|$)' \
    '\.key([/[:space:]"\\]|$)' \
    'id_rsa'
  do
    if printf '%s' "$PATCH_TEXT" | grep -qE "$pattern"; then
      deny "Blocked by D6 secret-filename guard: this apply_patch call appears to target a secret-adjacent filename (matched pattern: $pattern). This is a development-only guard, not a content scanner; the security-review-equivalent specialist still performs the broader pattern scan at REV."
    fi
  done
fi

# --- D1: absolute-rule command set, Bash/exec ---
if [ "$TOOL_NAME" = "Bash" ] || [ "$TOOL_NAME" = "exec" ] || [ "$TOOL_NAME" = "shell" ]; then
  COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // (.tool_input | tostring)')"

  case "$COMMAND" in
    *"git push"*)
      deny "Blocked by D1 absolute-rule guard: git push is never performed by an agent (risk-and-approval-policy.md section 2, rule 1). Command was: $COMMAND"
      ;;
    *"git tag"*)
      deny "Blocked by D1 absolute-rule guard: git tag is never performed by an agent. Command was: $COMMAND"
      ;;
    *"npm publish"*)
      deny "Blocked by D1 absolute-rule guard: npm publish is never performed by an agent. Command was: $COMMAND"
      ;;
    *"npm version"*)
      deny "Blocked by D1 absolute-rule guard: npm version is never performed by an agent. Command was: $COMMAND"
      ;;
    *"gh pr merge"*)
      deny "Blocked by D1 absolute-rule guard: gh pr merge is never performed by an agent. Command was: $COMMAND"
      ;;
    *"gh release"*)
      deny "Blocked by D1 absolute-rule guard: gh release is never performed by an agent. Command was: $COMMAND"
      ;;
  esac

  # D6 secret-adjacent filenames via Bash (e.g. cat/redirect into a secret
  # file), same fixed pattern list as the apply_patch branch above.
  case "$COMMAND" in
    *".env"*|*".pem"*|*".key"*|*"id_rsa"*)
      deny "Blocked by D6 secret-filename guard: this Bash command references a secret-adjacent filename pattern (.env, .env.*, *.pem, *.key, id_rsa*). Command was: $COMMAND"
      ;;
  esac
fi

exit 0
