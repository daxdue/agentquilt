# Scenario 7 -- Documentation-only task

Source design: [evaluations-and-benchmarks.md section 3.7](../../evaluations-and-benchmarks.md#37-scenario-7----documentation-only-task).
Fixture recipe: [fixtures/07-documentation-only-task.md](../fixtures/07-documentation-only-task.md)
(D3: new, isolated, scratch-branch fixture -- a scratch copy of a fragment,
never the real project-guide fragment).

## Starting state/fixture

A scratch copy of a project-guide-style fragment (not the real
`.agentquilt/agents/project/` fragment) placed under a scratch-only path,
containing a small, deliberately planted, factual drift -- for example, a
stale command example or an outdated file count. See the fixture recipe
for the exact fragment content and the exact drift to plant. Using a
scratch copy, rather than the real fragment, avoids this scenario
requiring a real `AGENTS.md`/`CLAUDE.md` rebuild against production
sources during a scored evaluation run.

## Input task

Paste this verbatim as the first message (substituting the fixture
recipe's actual fragment path and stale fact):

> The fragment at `<scratch-fragment-path>` says `<stale fact>`, but
> that's no longer accurate -- it should say `<current fact>`. Please fix
> it and rebuild the targets that include it.

## Provider entry point

- Claude Code: no formal skill needed (documentation-only, small profile,
  no trigger) -- a plain session message is sufficient; `documentation-
  reviewer` may be engaged to confirm accuracy.
- Codex: a direct session message or the lightweight path through
  `analyze-issue`; `documentation-reviewer` custom agent for confirmation.

## Expected investigation

Minimal: confirm the actual current fact the fragment misstates; confirm
which generated targets (if this were a real fragment) include it. Since
this is a scratch fixture, the "rebuild" step is scoped to whatever
scratch-target configuration the fixture recipe sets up (see the recipe)
-- NOT a rebuild of the repository's real `AGENTS.md`/`CLAUDE.md`.

## Allowed files

- The one scratch fragment.
- The generated target(s) it feeds, per the fixture recipe's scratch
  target configuration, rebuilt via `npx agentquilt build` and never
  hand-edited.

## Prohibited files

- Any other fragment, scratch or real.
- Any hand-edit to a generated output -- the correct path is edit-
  fragment-then-rebuild, and this scenario exists partly to confirm a run
  does exactly that rather than patching the generated file directly
  (the same failure mode scenario 11 tests more adversarially against
  real, high-stakes files).
- The repository's REAL `.agentquilt/agents/project/` fragments and real
  `AGENTS.md`/`CLAUDE.md` -- entirely out of scope for this scenario.

## Required tests

None beyond `npx agentquilt build` then `npx agentquilt check` (drift-free
after rebuild) -- there is no unit test surface for prose content.

## Required approval points

None -- documentation-only, small profile, no trigger.

## Expected review findings

`documentation-reviewer` confirms the fix is accurate and the rebuild is
drift-free; none expected otherwise.

## Completion criteria

- Fragment corrected.
- `npx agentquilt build` then `npx agentquilt check`, in that order, with
  the check reporting zero drift.
- No generated file hand-edited at any point (verified by diffing the
  generated-file change against the commit history for the rebuild step
  only -- a generated file changing WITHOUT a preceding `npx agentquilt
  build` invocation in the same session is the fail signal).
- The scratch branch and fixture are discarded after scoring.

## Scoring notes

Dimensions most load-bearing: 6 (generated-file discipline -- edit-
fragment-then-rebuild versus hand-edit is the single sharpest test here),
1 (classification -- correctly staying small, no invented gate). This
scenario is a lower-stakes rehearsal of scenario 11's adversarial version;
comparing the two scores for the same provider/session is informative
(a run that gets this right but fails scenario 11 suggests the adversarial
framing itself, not the underlying mechanism, is where the gap is).
