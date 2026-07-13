---
name: develop-issue
description: "Run the complete AgentQuilt development loop for one issue or change request, end to end: classify, investigate, plan, pause for approval, implement one bounded task at a time, test, independently review, fix findings, check regressions and generated-output drift, review documentation impact, run full repository checks, and hand off a PR-ready report. When an agent needs to: (1) Develop an issue end to end, (2) Work a change request from start to PR-ready, (3) Run the full AgentQuilt SDLC loop on a task, or (4) Take a GitHub issue through classification, planning, implementation, and review as one continuous effort. Composes analyze-issue, plan-change, implement-task, and review-tree by name at each stage; never inlines their procedures. Stops immediately at every approval gate and never continues past an unresolved trigger."
---

# Develop Issue

The full CLS-to-PRP loop, per the phase doc's 13-step standard development
loop and [lifecycle.md](../../../.docs/agentic-sdlc/lifecycle.md). This skill
is a composite: each stage below is handled by the correspondingly-named
skill or agent, referenced here by name, not restated
([handoff-contract.md rule 2](../../../.docs/agentic-sdlc/handoff-contract.md#2-handoff-chain-and-rules) --
reference, don't restate). If a referenced skill's own file changes, this
skill's behavior changes with it automatically; do not copy its steps here.

## When to use this skill

Use this when the Maintainer wants one continuous effort from a raw issue or
request through to a PR-ready report, or when a request is phrased as "work
this issue end to end," "develop this," or similar. Every internal stop
below (approval, reclassification, correction escalation) halts delegation
and waits for the Maintainer regardless of how this skill was invoked --
auto-triggering this skill carries no more risk than the loop already carries
by design.

Before proceeding: note the current branch and working-tree cleanliness
(`git status`, `git branch --show-current`), and keep the canonical-vs-
generated file distinction in view throughout (`AGENTS.md`, `CLAUDE.md`,
`.claude/agents/*.md`, and `agentquilt.lock` are rebuild outputs only; their
sources live under `.agentquilt/`).

## The 13-step loop

| # | Step (phase doc) | Stage | Handled by | Agent(s) |
| - | ----------------- | ----- | ---------- | -------- |
| 1 | inspect the issue or user request | CLS (start) | `analyze-issue` skill | implementation-planner (or directly, for a trivially small change) |
| 2 | classify risk | CLS | `analyze-issue` skill | implementation-planner |
| 3 | delegate repository investigation to a read-only analyst | INV | `analyze-issue` skill | repository-analyst (parallel for high-risk) |
| 4 | create an evidence-backed plan | PLN | `plan-change` skill | implementation-planner |
| 5 | pause for approval when required | APP | `plan-change` skill (stop) | Maintainer |
| 6 | delegate one bounded implementation task | IMP | `implement-task` skill, looped per task, strictly sequential | feature-implementer |
| 7 | run focused tests | VER | `implement-task` skill | test-engineer |
| 8 | delegate independent review | REV | `review-tree` skill | architecture-reviewer (+ specialists per routing) |
| 9 | fix accepted findings | COR | `implement-task` skill reused for the fix; original reviewer re-checks | feature-implementer + the same reviewer that raised the finding |
| 10 | run regression and generated-output review | RGR | direct step below (no separate top-level skill) | regression-reviewer |
| 11 | review documentation impact | DOC | direct step below | documentation-reviewer |
| 12 | run full repository checks | VAL | direct step below | test-engineer |
| 13 | produce a PR-ready report | PRP | `/prepare-pr` command | feature-implementer assembles |

## Steps 10-12: direct steps (no separate top-level skill)

These three stages are steps inside this loop, not standalone workflows (per
the phase doc's required-workflow list, which names 8 entry points and treats
RGR/DOC/VAL as loop stages, not entry points):

- **Step 10 (RGR).** Delegate to the `regression-reviewer` agent for behavior
  deltas, generated-output drift, and golden-file/fixture diffs traced to root
  cause. Never accept an unexplained fixture diff.
- **Step 11 (DOC).** Delegate to the `documentation-reviewer` agent for doc
  impact and staleness, explicitly including whether `AGENTS.md`/`CLAUDE.md`
  remain current via their source fragments under
  `.agentquilt/agents/project/`.
- **Step 12 (VAL).** Delegate to the `test-engineer` agent for full repository
  checks (build, full test suite, and `npx agentquilt check` if anything under
  `.agentquilt/` or a generated file's source changed).

## Non-negotiable loop rules

- "Do not use one general-purpose agent for the entire flow without
  independent review" -- step 8's `review-tree` delegation is mandatory in the
  standard and high-risk profile even when every prior step went smoothly.
- Steps 6-7 loop per bounded task from the approved plan, strictly
  sequentially. No two `implement-task` invocations run concurrently in the
  same working tree. Worktree-parallel writes are reserved for a later phase
  and are not available here.
- If step 10 or step 12 discovers a trigger the plan did not flag (for
  example, an unexpected schema touch), stop this loop and re-enter
  `plan-change` for reclassification before continuing. Upward
  reclassification is immediate and unilateral -- never continue past a newly
  discovered trigger silently.
- If step 12's full validation surfaces a failing deterministic check rather
  than a design or scope problem, delegate to the `fix-ci` skill rather than
  re-deriving the same diagnose-fix-verify procedure inline.
- At step 13, invoke the `/prepare-pr` command -- do not assemble the PR
  Summary inline in this skill. `/prepare-pr` never runs `git push` or
  `gh pr create`; those remain the Maintainer's explicit actions.

## Never

- Never inlines the procedures of `analyze-issue`, `plan-change`,
  `implement-task`, `review-tree`, or `fix-ci` -- reference them by name so
  each stays the single source of truth for its stage.
- Never continues past step 5's approval gate without a recorded Maintainer
  decision.
- Never skips step 8's independent review, regardless of how confident the
  implementation looks.
- Never runs `git push`, `gh pr create`, or any publish/merge/tag/version
  action at any step -- those are outside this loop entirely.
