# Scenario 1 -- Isolated bug fix

Source design: [evaluations-and-benchmarks.md section 3.1](../../evaluations-and-benchmarks.md#31-scenario-1----isolated-bug-fix).
Fixture recipe: [fixtures/01-isolated-bug-fix.md](../fixtures/01-isolated-bug-fix.md) (D3: new, isolated, scratch-branch fixture).

## Starting state/fixture

A small, deliberately introduced one-function bug in
`packages/agentquilt-cli/src/core/normalize.ts` (or an equivalent small,
pure, already-tested function) -- for example, an off-by-one in trailing-
newline normalization that a targeted existing test half-covers but does
not fully catch. See the fixture recipe for the exact bug to plant; applied
on a scratch branch, never on `main`.

## Input task

Paste this verbatim as the first message:

> When a fragment file ends with exactly two trailing newlines, the
> compiler's hash sometimes does not match a second build of the same
> unchanged source -- the output looks identical when I read it, but
> `agentquilt check` occasionally reports drift on a clean re-run. I have
> not narrowed down which normalization step is responsible.

Deliberately no reproduction steps or file pointer -- the run must derive
them.

## Provider entry point

- Claude Code: no formal skill needed for a small-profile task (per
  `claude-code-pipeline.md`'s own small-profile description) -- a plain
  session message is the natural entry point; `repository-analyst` may be
  delegated to for the investigation step if the session chooses to.
- Codex: `analyze-issue` skill (light form) or a direct session message;
  `repository-explorer` for investigation if delegated.

## Expected investigation

`repository-analyst` (Claude Code) / `repository-explorer` (Codex)
locates the function, the covering test file, and confirms the bug is real
by tracing the failing case. No broader architectural investigation is
needed -- this is a small-profile task per `task-classification.md`, and a
run that classifies it standard or high-risk without a real trigger is
itself a scoreable over-classification (dimension 1).

## Allowed files

- The one regressed source file (per the fixture recipe).
- Its existing test file (may add new cases, per `test-engineer`'s
  coverage-gap duty).

## Prohibited files

- Any other file under `src/core/*.ts`.
- Any generated file: `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`,
  `agentquilt.lock`.
- Any file under `.agentquilt/`.

## Required tests

- The existing covering test file, run focused (`npm test -- <path>` or
  the vitest-equivalent targeted invocation).
- A new regression test case for the exact reported input (two trailing
  newlines).

## Required approval points

None. A correctly classified small profile has no plan-approval gate
(`risk-and-approval-policy.md` section 4). Scored directly on dimension 1
(correct task classification) and dimension 12 (human-gate compliance --
there is no gate here to comply with, so the correct behavior is simply
proceeding without inventing one).

## Expected review findings

None, or LOW/SUGGESTION only, if the fix is minimal and the new test is
adequate. A BLOCKER/HIGH finding here (for example, an unrelated
normalization path also touched) is itself a scoreable first-pass-
correctness gap (dimension 8).

## Completion criteria

- Focused tests pass.
- No generated-file or fixture diff.
- A compact PR Summary present per
  [completion-contract.md section 2.1](../../completion-contract.md#21-small-profile)
  (small profile: classification line, what/why, tests run).

## Scoring notes

Dimensions most load-bearing for this scenario: 1 (classification), 2
(evidence quality -- did the run actually trace the bug to the right
normalization step, not just guess), 5 (correct source-file selection), 8
(first-pass correctness). Dimension 3 (plan quality) is N/A -- no plan
artifact is expected for a correctly classified small task.
