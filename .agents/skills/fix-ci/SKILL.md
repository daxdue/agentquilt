---
name: fix-ci
description: "Diagnose and fix a failing deterministic check (build error, test failure, coverage shortfall, or agentquilt check drift) on an existing branch or PR, then re-verify with the authoritative command. Use when an agent needs to: (1) fix failing CI, (2) diagnose why a build, test, or drift check is red, (3) re-run the authoritative check after a fix, or (4) determine whether a CI failure is a simple bug versus a sign the change needs re-planning. Delegates root-cause investigation to the repository-explorer custom agent when unclear, the fix to feature-implementer, and re-verification to the same authoritative command. Never silently updates a fixture or baseline to make a failure go away."
---

# Fix CI

Ad hoc red-check correction, distinct from the `standard-development`
skill's own COR step because the entry evidence differs: a failing command's
output here, versus a Review Findings artifact there.

## When to use this skill

Use when a deterministic check is failing -- `npm run build`, `npm test`,
`agentquilt check` -- on an existing branch or PR, independent of
whether a full `standard-development` loop is in progress.

Before proceeding: note the current branch and working-tree cleanliness
(`git status`, `git branch --show-current`), and keep the canonical-vs-
generated file distinction in view throughout (`AGENTS.md`, `CLAUDE.md`,
`.claude/agents/*.md`, and `agentquilt.lock` are rebuild outputs only; their
sources live under `.agentquilt/`).

## Steps

1. **Read the failing command's exact output.** Do not guess at the cause
   from the command name alone; read the actual error text, stack trace, or
   diff.
2. **Delegate investigation if the cause is unclear.** Delegate to the
   `repository-explorer` custom agent (`sandbox_mode = "read-only"`) to
   trace the failure to its root cause when the failing output alone does
   not make the cause obvious.
3. **Delegate the fix.** Delegate to the `feature-implementer` custom agent
   (`sandbox_mode = "workspace-write"`) to apply the fix. If the failure is
   a golden-file or fixture mismatch, the fix must include a recorded root
   cause -- silently regenerating the fixture to match current output
   without explaining why is prohibited (`.docs/agentic-sdlc/
   risk-and-approval-policy.md` section 6).
4. **Re-run the authoritative command.** Use the exact authoritative
   command that was failing (`.docs/agentic-sdlc/validation-evidence.md`
   section 3), not a narrower substitute, to confirm the fix actually
   resolves the failure.
5. **Reclassify if the fix touches a new trigger.** If the fix itself
   touches a previously unflagged gate trigger (`.docs/agentic-sdlc/
   task-classification.md` section 2.1), invoke the `plan-change` skill for
   reclassification before considering the fix complete.

## Output

A passing re-run of the authoritative command, plus a short record of the
root cause and the fix, appended to whatever Return Handoff or PR context
this fix belongs to.

## Never

- Never updates a fixture or baseline without a recorded root-cause
  explanation and, where required, the Maintainer's approval reference.
- Never weakens an assertion, broadens a matcher, or skips a case just to
  make a failing test pass.
- Never overrides CI or claims a check passed without actually re-running
  it.
- Never expands scope beyond the fix itself -- unrelated findings go back
  through `plan-change`, not silently folded into this fix.
