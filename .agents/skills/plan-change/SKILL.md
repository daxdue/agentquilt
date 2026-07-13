---
name: plan-change
description: "Turn a Repository Investigation into an evidence-backed Implementation Plan of ordered bounded tasks, flag every approval-gate trigger, and pause for Maintainer approval when one is present. Use when an agent needs to: (1) plan a change once investigation is done, (2) break a task into ordered, bounded implementation steps, (3) determine which approval gate a change needs before implementation starts, or (4) re-plan after a mid-implementation reclassification. Delegates planning to the implementation-planner custom agent. Read-only: never implements; stops at the approval gate instead of guessing a decision."
---

# Plan Change

Stage: PLN (implementation planning) + APP (approval gate), per
`.docs/agentic-sdlc/lifecycle.md` and
`.docs/agentic-sdlc/risk-and-approval-policy.md`.

## When to use this skill

Use once a Task Classification and Repository Investigation already exist
(from `analyze-issue` or an earlier stage in this session). This is the
entry point for turning "what needs to change" into "an ordered set of
bounded tasks a single implementer turn can execute."

## Steps

1. **Delegate planning.** Delegate to the `implementation-planner` custom
   agent for the Implementation Plan (format:
   `.docs/agentic-sdlc/implementation-plan-contract.md` section 4), with an
   architecture-plan section for high-risk changes. Every task in the plan
   must meet the bounded-task definition (section 2 of that contract).
2. **Flag every trigger.** Cross-check the plan against every gate trigger
   in `.docs/agentic-sdlc/task-classification.md` section 2.1. A trigger
   found here that the earlier classification missed means the
   classification was wrong -- escalate, do not silently plan around it.
3. **Stop for approval when required.** If any trigger is flagged, or the
   profile is high-risk, state plainly that this skill is pausing for the
   Maintainer's recorded decision, and stop. Do not proceed to
   implementation on the assumption of approval. This mirrors Codex's own
   turn-taking: a skill's instructions can direct the session to stop and
   wait exactly as this one does; there is no separate structural "pause"
   primitive beyond the model choosing not to proceed.
4. **Resume only on recorded approval.** Once the Maintainer's decision is
   recorded, continue to per-task Implementation Handoffs for the
   `implement-task` skill/`feature-implementer` custom agent.

## Output

An Implementation Plan, self-contained per
`.docs/agentic-sdlc/handoff-contract.md` section 2, plus the approval
reference once a gate is cleared.

## Never

- Never implements or edits any file. This skill and the
  `implementation-planner` custom agent it delegates to run with
  `sandbox_mode = "read-only"`.
- Never downgrades a classification -- human-only
  (`.docs/agentic-sdlc/task-classification.md` section 4).
- Never approves its own plan or assumes approval without a recorded
  Maintainer decision.
- Never names a command outside the authoritative set
  (`.docs/agentic-sdlc/validation-evidence.md` section 3).
