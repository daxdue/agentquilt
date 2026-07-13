---
name: review-tree
description: "Run independent review of the working tree or a set of implemented bounded tasks, fanning out to conditional specialists as the touched areas require, and merge everything into one Review Findings artifact. When an agent needs to: (1) Review the working tree or an in-progress diff, (2) Get an independent second opinion before a PR, (3) Determine which specialists (security, schema, deterministic-output, eval, supply-chain, ambiguity) a change needs, or (4) Produce a Review Findings summary table with severities. Delegates the primary review to architecture-reviewer and fans out in parallel to touched-area specialists. Read-only: never fixes, never approves, never reviews its own session's unreviewed work."
---

# Review Tree

Stage: REV (independent review), with conditional specialist fan-out, per
[review-contract.md](../../../.docs/agentic-sdlc/review-contract.md) and
[agent-portfolio.md section 5.2](../../../.docs/agentic-sdlc/agent-portfolio.md#52-by-task-type-typical-classification-and-specialist-routing).

## When to use this skill

Entry condition: bounded tasks have been implemented and focus-verified
(standard/high-risk profile), or a final diff is ready for the small-profile
diff review. This is step 8 of `develop-issue`'s loop and can also be invoked
standalone against the current working tree's diff at any time, for example
before manually starting `/prepare-pr`.

## Steps

1. **Delegate the primary review.** Delegate to the `architecture-reviewer`
   agent for the independent review, using the checklist in
   [review-contract.md section 4](../../../.docs/agentic-sdlc/review-contract.md#4-agentquilt-specific-review-checklist).
   This step is mandatory in the standard and high-risk profile even if every
   prior step went smoothly -- "do not use one general-purpose agent for the
   entire flow without independent review" is non-negotiable. The small
   profile still performs the diff-review form of this step.
2. **Fan out to specialists in parallel, read-only.** Delegate, in one batch
   of parallel calls, to whichever specialists
   [agent-portfolio.md section 5.2](../../../.docs/agentic-sdlc/agent-portfolio.md#52-by-task-type-typical-classification-and-specialist-routing)
   names for the touched areas: `security-review`, `schema-design`,
   `deterministic-output`, `eval-designer`, `supply-chain-risk`, or
   `ambiguity-detector` if a done-criteria issue surfaces at this stage. None
   of these agents write; the batch is safe to run concurrently.
3. **Merge findings.** Combine every agent's findings into one Review Findings
   artifact ([format](../../../.docs/agentic-sdlc/review-contract.md#52-finding-format))
   with a single summary table across all reviewers.

## Output

One merged Review Findings artifact, severities per
[review-contract.md section 5.1](../../../.docs/agentic-sdlc/review-contract.md#51-severity-ladder).
Hand BLOCKER/HIGH findings to `implement-task`'s correction-loop reuse (step
9); the same reviewing agent instance that raised a finding re-checks its fix.

## Never

- Never fixes anything itself -- findings only, never edits.
- Never approves. Review Findings inform the Maintainer and the correction
  loop; they are not an approval artifact.
- Never reviews work that this same session implemented without having
  spawned an independent reviewing agent instance for it -- self-review by the
  implementing session does not satisfy this stage.
