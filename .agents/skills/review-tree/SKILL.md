---
name: review-tree
description: "Run independent review of the working tree or a set of implemented bounded tasks, fanning out to conditional specialists as the touched areas require, and merge everything into one Review Findings artifact. Use when an agent needs to: (1) review the working tree or an in-progress diff, (2) get an independent second opinion before a PR, (3) determine which specialists (security, schema, deterministic-output, eval, supply-chain, ambiguity) a change needs, or (4) produce a Review Findings summary table with severities. Delegates the primary review to the architecture-reviewer custom agent and the read-only test-adequacy review to test-reviewer, fanning out in parallel to touched-area specialists. Read-only: never fixes, never approves, never reviews its own session's unimplemented work."
---

# Review Tree

Stage: REV (independent review), per `.docs/agentic-sdlc/lifecycle.md` and
`.docs/agentic-sdlc/review-contract.md`.

## When to use this skill

Use once one or more bounded tasks are implemented (diff exists) and are
ready for independent review -- either as part of the `standard-development`
loop's step 7, or standalone for a working-tree diff review outside that
loop.

## Steps

1. **Delegate primary review.** Delegate to the `architecture-reviewer`
   custom agent (`sandbox_mode = "read-only"`) for design conformance, ADR
   necessity, schema and public-interface impact, code-level correctness,
   error handling, security-relevant patterns, and test adequacy, per the
   review checklist (`.docs/agentic-sdlc/review-contract.md` section 4).
2. **Delegate test-adequacy review.** In parallel, delegate to the
   `test-reviewer` custom agent (`sandbox_mode = "read-only"`) to assess
   whether the Return Handoff's recorded verification actually exercises
   the changed behavior. This agent never runs a test itself.
3. **Fan out to specialists as required.** Determine which of the 6
   conditional specialists the touched areas trigger, per
   `.docs/agentic-sdlc/agent-portfolio.md` section 5.2, and delegate to each
   in parallel (none of them write):
   - `security-review` -- security high-risk trigger, or diffs touching
     `src/core/configLoader.ts`, `src/core/fragmentScanner.ts`,
     `src/core/adapters/`, suspected secrets, or untrusted-content-reaches-
     output changes.
   - `schema-design` -- schema/persisted-format changes
     (`schemas/*.schema.json`, Zod schemas, manifest/block/lock format).
   - `deterministic-output` -- compiler-semantics changes (normalization,
     hashing, ordering, target versioning, adapters) or any golden fixture
     change.
   - `eval-designer` -- changes to agent instruction sources under
     `.agentquilt/agents/` (beyond mechanical rebuilds), skills, eval
     strategy, or a possible semantic shift in compiled output.
   - `supply-chain-risk` -- any dependency addition/change or lockfile
     diff with new edges.
   - `ambiguity-detector` -- unresolved ambiguity flagged earlier and not
     yet settled.
4. **Delegate regression and documentation review.** Also delegate to
   `regression-reviewer` (behavior deltas, generated-output drift, golden/
   fixture diffs, public CLI compatibility) and `documentation-reviewer`
   (doc impact and staleness, including the explicit AGENTS.md/CLAUDE.md
   fragment-currency check).
5. **Merge into one Review Findings artifact.** Combine every delegate's
   findings into a single table using the BLOCKER/HIGH/MEDIUM/LOW/
   SUGGESTION ladder (`.docs/agentic-sdlc/review-contract.md` section 5.2).
   Do not deduplicate away a genuine disagreement between two reviewers --
   record both.

## Output

One merged Review Findings artifact, self-contained per
`.docs/agentic-sdlc/handoff-contract.md` section 2.

## Never

- Never fixes anything -- resolution belongs to the correction loop
  (`implement-task` skill / `feature-implementer` custom agent).
- Never approves or merges.
- Never reviews work implemented inside this same skill's own invocation --
  independence is structural: every agent this skill delegates to runs
  `sandbox_mode = "read-only"` and never touched the diff being reviewed.
- Never accepts a golden/fixture diff without a recorded root cause (that
  is a BLOCKER by contract, per `regression-reviewer`'s own rules).
