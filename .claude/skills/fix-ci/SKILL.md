---
name: fix-ci
description: "Diagnose and fix a failing deterministic check (build error, test failure, coverage shortfall, or agentquilt check drift) on an existing branch or PR, then re-verify with the authoritative command. When an agent needs to: (1) Fix failing CI, (2) Diagnose why a build, test, or drift check is red, (3) Re-run the authoritative check after a fix, or (4) Determine whether a CI failure is a simple bug versus a sign the change needs re-planning. Delegates root-cause investigation to repository-analyst when unclear, the fix to feature-implementer, and re-verification to test-engineer. Never silently updates a fixture or baseline to make a failure go away."
---

# Fix CI

Ad hoc red-CI / red-check correction -- distinct from `develop-issue` step 9's
correction loop, which fixes *review findings*, not check failures. The two
share mechanics (delegate the fix to `feature-implementer`, re-verify via
`test-engineer`) but differ in entry evidence: this skill starts from a
failing command's output, not a Review Findings artifact.

## When to use this skill

Trigger: the Maintainer reports, or the session observes, a failing
deterministic check on an existing branch or PR -- a build error, a test
failure, a coverage shortfall, or `agentquilt check` drift.

Before proceeding: note the current branch and working-tree cleanliness
(`git status`, `git branch --show-current`), and keep the canonical-vs-
generated file distinction in view throughout (`AGENTS.md`, `CLAUDE.md`,
`.claude/agents/*.md`, and `agentquilt.lock` are rebuild outputs only; their
sources live under `.agentquilt/`).

## Steps

1. **Read the failing command's exact output.** Do not guess at the cause
   from the command name alone; read the actual error text, stack trace, or
   diff.
2. **Investigate if the cause is unclear.** If the failure's root cause is not
   obvious from its output, delegate to the `repository-analyst` agent for a
   bounded investigation scoped to just that failure -- not a full repository
   investigation.
3. **Delegate the fix.** Delegate the fix to the `feature-implementer` agent
   as a bounded task, with the failing output and (if produced) the
   investigation as its evidence.
4. **Re-verify.** Delegate to the `test-engineer` agent to re-run the exact
   authoritative command that failed, plus anything it covers (for example, a
   full `npm test` run if a single test file failed, since a narrow re-run can
   hide a regression the fix introduced elsewhere).
5. **Check for a newly surfaced trigger.** If the fix touches a previously
   unflagged trigger area (for example, the failure traces back to a schema
   mismatch that was not part of the original plan's scope), stop and re-enter
   `plan-change` rather than patching past a reclassification event.

## Never

- Never silently updates a fixture or baseline to make the failure go away.
  An unexplained fixture or baseline diff is a BLOCKER regardless of which
  workflow produced it
  ([risk-and-approval-policy.md section 6](../../../.docs/agentic-sdlc/risk-and-approval-policy.md#6-baseline-and-snapshot-changes)).
  If a fixture genuinely needs to change, that change needs its own root-cause
  explanation in the fix's evidence, not a silent update.
- Never hand-edits a generated file to force a drift check green -- if
  `agentquilt check` is failing, the fix is to correct the source fragment
  or manifest and rebuild with `agentquilt build`, never to hand-edit
  `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`, or `agentquilt.lock`.
- Never re-runs only a narrower check than the one that failed and calls it
  verified.
