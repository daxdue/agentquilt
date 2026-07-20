---
name: plan-change
description: "Turn a Repository Investigation into an evidence-backed Implementation Plan of ordered bounded tasks, flag every approval-gate trigger, and pause for Maintainer approval when one is present. When an agent needs to: (1) Plan a change once investigation is done, (2) Break a task into ordered, bounded implementation steps, (3) Determine which approval gate a change needs before implementation starts, or (4) Re-plan after a mid-implementation reclassification. Delegates planning to implementation-planner and, on request, done-criteria review to ambiguity-detector. Read-only: never implements; stops at the approval gate instead of guessing a decision."
---

# Plan Change

Stage: PLN (implementation planning) + CLS re-confirmation + APP trigger, per
[lifecycle.md](../../../.docs/agentic-sdlc/lifecycle.md) and
[risk-and-approval-policy.md](../../../.docs/agentic-sdlc/risk-and-approval-policy.md).

## When to use this skill

Entry condition: a Repository Investigation exists, either produced by the
`analyze-issue` skill or supplied directly by the Maintainer. This is step 4-5
of `develop-issue`'s loop and can also be invoked standalone to (re-)plan a
change, including re-entry after a mid-implementation reclassification.

Before proceeding: note the current branch and working-tree cleanliness
(`git status`, `git branch --show-current`), and keep the canonical-vs-
generated file distinction in view throughout (`AGENTS.md`, `CLAUDE.md`,
`.claude/agents/*.md`, and `agentquilt.lock` are rebuild outputs only; their
sources live under `.agentquilt/`).

## Steps

1. **Produce the Implementation Plan.** Delegate to the
   `implementation-planner` agent for the Implementation Plan
   ([format](../../../.docs/agentic-sdlc/implementation-plan-contract.md#4-artifact-format-implementation-plan)):
   ordered bounded tasks, each with risk flags, gate triggers, and per-task
   test and rebuild steps.
2. **Check done-criteria testability on request.** If the plan's done criteria
   for any task are not concretely checkable, delegate to `ambiguity-detector`.
3. **Flag every classification trigger with its gate.** For every trigger
   found in the Task Classification or newly surfaced during planning, name
   the specific gate it requires per
   [risk-and-approval-policy.md section 3](../../../.docs/agentic-sdlc/risk-and-approval-policy.md#3-approval-gate-triggers).
4. **Name expected reviewers, advisory only.** State which specialists the
   plan expects to engage at REV per
   [agent-portfolio.md section 5.2](../../../.docs/agentic-sdlc/agent-portfolio.md#52-by-task-type-typical-classification-and-specialist-routing).
   This is a forward-looking note for `review-tree`; specialists are not
   invoked here.

## Approval gate

If any risk flag is present, or the profile is high-risk, this skill stops
immediately after presenting the plan and the investigation. It states plainly
that it is pausing for the Maintainer's recorded decision
([risk-and-approval-policy.md section 5](../../../.docs/agentic-sdlc/risk-and-approval-policy.md#5-recording-decisions))
and performs no further delegation in the same turn. This is the "pause for
approval when required" step of the develop-issue loop, made concrete: do not
invoke `implement-task` until the approval decision is recorded in the
conversation or the artifact itself.

If the plan carries no trigger and the profile is small, no gate applies;
state that explicitly and proceed.

## Output

An Implementation Plan with an accurate `Approval status:` line -- either
"approved" with the recorded decision, or "pending Maintainer approval" if
this skill stopped at the gate.

## Never

- Never implements anything itself.
- Never proceeds past a flagged trigger without a recorded Maintainer decision.
- Never treats a specialist's advisory routing note as a substitute for
  actually running that specialist at `review-tree` later.
