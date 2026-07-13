---
name: implement-task
description: "Execute exactly one approved bounded task from an Implementation Handoff, run its focused verification, and produce a Return Handoff for review. When an agent needs to: (1) Implement one approved task from a plan, (2) Run focused tests after a bounded change, (3) Fix an accepted review finding as a correction task, or (4) Rebuild generated files after editing their source fragments. Delegates implementation to feature-implementer and focused verification to test-engineer. Never starts without a handoff; never expands scope beyond the handoff's allowed file set; never hand-edits a generated file."
---

# Implement Task

Stage: IMP (implementation) + VER (focused verification); also reused for COR
(correction loop), per
[handoff-contract.md](../../../.docs/agentic-sdlc/handoff-contract.md) and
[validation-evidence.md](../../../.docs/agentic-sdlc/validation-evidence.md).

## When to use this skill

Entry condition: a dispatchable Implementation Handoff exists per
[handoff-contract.md section 5](../../../.docs/agentic-sdlc/handoff-contract.md#5-entry-and-exit-criteria) --
one bounded task, its file set named and each file marked canonical or
generated, its approval recorded if the task carries a trigger. This is step
6-7 of `develop-issue`'s loop, looped once per bounded task, and is also
invoked standalone once a plan is already approved. It is reused for step 9
(fix accepted review findings) -- see "Reused for correction" below.

Before proceeding: note the current branch and working-tree cleanliness
(`git status`, `git branch --show-current`), and keep the canonical-vs-
generated file distinction in view throughout (`AGENTS.md`, `CLAUDE.md`,
`.claude/agents/*.md`, and `agentquilt.lock` are rebuild outputs only; their
sources live under `.agentquilt/`).

## Steps

1. **Delegate implementation.** Delegate to the `feature-implementer` agent
   with the Implementation Handoff verbatim -- do not paraphrase or summarize
   the handoff before passing it on.
2. **Delegate focused verification.** Delegate to the `test-engineer` agent
   for the task's named focused verification. Always include
   `npx agentquilt check` whenever the task touched fragments, manifests,
   config, or a generated file
   ([validation-evidence.md section 4](../../../.docs/agentic-sdlc/validation-evidence.md#4-validation-levels)).
3. **Assemble the Return Handoff.** Produce the Return Handoff
   ([format](../../../.docs/agentic-sdlc/handoff-contract.md#4-artifact-format-return-handoff-implementer-to-reviewer))
   from the implementer's and test-engineer's outputs.

## Reused for correction (COR)

When `review-tree` returns BLOCKER or HIGH findings, this same skill dispatches
the fix as a bounded correction task to `feature-implementer`, using the
finding's own proposed verification method. After the fix, the *original*
reviewing agent instance (not a new one) re-checks the specific finding --
never a fresh reviewer starting over
([review-contract.md section 6](../../../.docs/agentic-sdlc/review-contract.md#6-correction-loop)).

## Never

- Never starts without a handoff. If no Implementation Handoff exists, stop
  and route back to `plan-change`.
- Never expands scope beyond the handoff's allowed file set. A task that needs
  to touch more files than the handoff named is not this task anymore -- go
  back to `plan-change` for re-planning, do not silently widen scope.
- Never hand-edits a generated file (`AGENTS.md`, `CLAUDE.md`,
  `.claude/agents/*.md`, `agentquilt.lock`). If a task's handoff carries a
  rebuild flag because it edits fragments or a manifest, run
  `npx agentquilt build` inside this same task and verify with
  `npx agentquilt check` -- never write the generated output directly.
- Never marks a finding resolved without the original reviewer's re-check.
