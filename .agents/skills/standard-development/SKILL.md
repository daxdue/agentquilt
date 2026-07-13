---
name: standard-development
description: "Run the complete AgentQuilt development loop for one issue or change request, end to end: classify, investigate, plan, pause for approval, implement one bounded task at a time, run focused validation, delegate independent reviews, perform corrective iteration, run broad validation, and prepare PR evidence. Use when an agent needs to: (1) develop an issue end to end, (2) work a change request from start to PR-ready, (3) run the full AgentQuilt SDLC loop on a task, or (4) take an issue through classification, planning, implementation, and review as one continuous effort. Composes analyze-issue, plan-change, implement-task, and review-tree by name at each step; never inlines their procedures. Stops immediately at every approval gate and never continues past an unresolved trigger."
---

# Standard Development

Direct Codex-native counterpart to the equivalent Claude Code loop,
implementing the identical `.docs/agentic-sdlc/lifecycle.md` stages (CLS
through PRP) via Codex custom-agent delegation instead of a closed-enum
subagent-dispatch tool. The 10 steps below are this repository's Phase 5
phase doc's own required list; each step names the custom agent(s) it
delegates to.

## The 10-step loop

1. **Classify (CLS).** Delegate to `implementation-planner` (or invoke the
   `analyze-issue` skill's classification step, referenced, not inlined).
2. **Delegate exploration (INV).** Invoke the `analyze-issue` skill
   (referenced) to run the Repository Investigation via `repository-explorer`,
   parallel instances for high-risk disjoint questions.
3. **Synthesize plan (PLN).** Invoke the `plan-change` skill (referenced) to
   produce the Implementation Plan via `implementation-planner`.
4. **Request approval where required (APP).** `plan-change`'s own stop
   behavior applies: if any trigger is flagged or the profile is high-risk,
   stop here and state plainly that this skill is pausing for the
   Maintainer's recorded decision. Do not proceed past this step without a
   recorded approval.
5. **Delegate implementation (IMP).** Invoke the `implement-task` skill
   (referenced), looped once per bounded task from the plan, strictly
   sequential -- no two `feature-implementer` delegations run concurrently
   in the same working tree.
6. **Run focused validation (VER).** Performed inside `implement-task`'s own
   turn by the `feature-implementer` custom agent (`sandbox_mode =
   "workspace-write"`); the `test-reviewer` custom agent may be consulted
   for adequacy opinion, never for execution.
7. **Delegate independent reviews (REV, plus RGR and DOC as sub-steps).**
   Invoke the `review-tree` skill (referenced): `architecture-reviewer` and
   `test-reviewer` in parallel (both read-only, non-overlapping), fanned out
   to `regression-reviewer`, `documentation-reviewer`, and whichever of the
   6 conditional specialists the touched areas require. Mandatory in the
   standard and high-risk profile; the small profile still performs the
   diff-review form of this step.
8. **Perform corrective iteration (COR).** For every BLOCKER/HIGH finding,
   re-invoke `implement-task` for the fix; the same reviewing agent that
   raised the finding re-checks using its own proposed verification method.
9. **Run broad validation (VAL).** Delegate execution of the full
   authoritative command set (`.docs/agentic-sdlc/validation-evidence.md`
   section 3) to `feature-implementer`'s workspace-write scope, since VAL
   requires running the complete deterministic check suite.
10. **Prepare PR evidence (PRP).** Invoke the `prepare-pr` skill (referenced)
    to assemble and print the PR Summary via `feature-implementer`.

## Non-negotiable rules

- Independent review (step 7) is mandatory in the standard and high-risk
  profile even if every prior step went smoothly; the small profile still
  performs the diff-review form of step 7.
- Step 5's implementation loop is strictly sequential. This is enforced by
  this skill's own instructions and by Codex's `agents.max_depth` (default
  1, which prevents a spawned custom agent from spawning further
  descendants) rather than a hard scheduler.
- If step 7 or a later stage discovers a trigger the plan did not flag,
  stop and re-enter `plan-change` for reclassification before continuing.
- If step 9's full validation surfaces a failing deterministic check rather
  than a design/scope problem, delegate to the `fix-ci` skill rather than
  re-deriving the same diagnose-fix-verify procedure inline.
- No agent in this loop ever runs `git push`, `gh pr create`, `gh pr
  merge`, `npm publish`, `npm version`, or `git tag`, under any
  circumstance.

## Delegation mechanism note

Codex's custom-agent delegation is prompt-recognized: this session's model
reads the `description` fields of the `.codex/agents/*.toml` files present
and decides to spawn one when its own instructions (this skill) or the
Maintainer's request match. There is no separate tool-call parameter with a
closed enum of agent names. Always name the target custom agent explicitly
when delegating (as each step above does) rather than leaving the choice
implicit, and keep delegation to the fixed 14-agent roster this repository
defines under `.codex/agents/` -- never invent a new agent name.

## Output

By the end of this loop: a PR Summary
(`.docs/agentic-sdlc/completion-contract.md` section 3), printed and ready
for the Maintainer's own `git push` / `gh pr create`, which this skill never
performs itself.

## Never

- Never runs `git push`, `gh pr create`, `gh pr merge`, or any
  release/publish action.
- Never skips step 7 (independent review) in the standard or high-risk
  profile.
- Never continues past step 4 without a recorded Maintainer approval when a
  trigger is flagged.
- Never lets two `feature-implementer` delegations run concurrently in the
  same working tree.
