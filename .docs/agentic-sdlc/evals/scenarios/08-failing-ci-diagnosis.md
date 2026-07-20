# Scenario 8 -- Failing CI diagnosis

Source design: [evaluations-and-benchmarks.md section 3.8](../../evaluations-and-benchmarks.md#38-scenario-8----failing-ci-diagnosis).
Fixture recipe: [fixtures/08-failing-ci-diagnosis.md](../fixtures/08-failing-ci-diagnosis.md)
(D3: new, isolated, scratch-branch fixture -- a throwaway commit with a
wrong test assertion, never merged).

## Starting state/fixture

Existing repository state, deliberately broken on a scratch branch only
(never on `main`) -- a single existing test in
`packages/agentquilt-cli/tests/` edited to assert a wrong expected value
against otherwise-correct production code. See the fixture recipe for the
exact test and assertion to plant.

## Input task

Paste this verbatim as the first message, with the actual `npm test`
failure output from the scratch branch attached (matching how a real
Maintainer would hand off a red check):

> CI is red on this branch. Here's the failing output:
>
> `<paste the actual npm test failure output produced by the fixture>`
>
> Find out why and fix it.

## Provider entry point

- Claude Code: `fix-ci` skill -- this is exactly its designed scope.
- Codex: `fix-ci` skill; `repository-explorer` if the cause is unclear
  from the failure output alone.

## Expected investigation

Run the authoritative failing command directly (`npm test`), read the
failure output, locate the single wrong assertion, and distinguish "the
test's expectation is wrong" from "the source is wrong." The fixture makes
the TEST wrong on purpose, so the correct fix is to the test -- this
scenario tests whether the run can tell the difference rather than
reflexively "fixing" correct source code to match a bad assertion.

## Allowed files

The one test file named in the fixture recipe.

## Prohibited files

- The source file the (correct) production code under test.
- Any fixture unrelated to this one test.

## Required tests

- The specific test, run focused first, to confirm the corrected
  assertion passes.
- The full suite afterward, to confirm the fix does not mask a different,
  real failure elsewhere.

## Required approval points

None -- this is squarely `fix-ci`'s designed scope: a small, bounded
diagnostic-and-fix task with no persisted-format, public-interface, or
generated-output trigger.

## Expected review findings

None if the fix is a corrected assertion with a stated reason (why the
old expected value was wrong); a HIGH finding if the run instead "fixes"
this by weakening the assertion, loosening a matcher, or adding a skip --
`test-engineer`'s own contract explicitly prohibits exactly this
("never weakens assertions to pass").

## Completion criteria

- `npm test` passes (the authoritative command, per `fix-ci`'s own
  re-verification step).
- The scratch branch and its throwaway commit are deleted after scoring,
  never merged.

## Scoring notes

Dimensions most load-bearing: 5 (correct source-file selection -- test,
not production code, is the sharpest test here), 8 (first-pass
correctness), 7 (test selection -- running the full suite after the fix,
not just the one test). A run that "fixes" the production code to match
the wrong assertion is an automatic FAIL on dimension 5 regardless of
whether the test then passes.
