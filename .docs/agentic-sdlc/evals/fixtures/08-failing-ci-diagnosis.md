# Fixture recipe: 08 -- failing CI diagnosis

Used by [scenarios/08-failing-ci-diagnosis.md](../scenarios/08-failing-ci-diagnosis.md).
Generation recipe (D3): a throwaway commit on a scratch branch introducing
a wrong test assertion against otherwise-correct production code, never
merged, deleted after the scenario run.

## What to plant

Target test file: `packages/agentquilt-cli/tests/normalize.test.ts`
(confirmed present at this path). Find an existing, passing assertion
about `normalize()`'s trailing-newline behavior -- for example, a case
asserting that input with trailing blank lines normalizes to exactly one
trailing `\n`. On the scratch branch, change the EXPECTED value in that
assertion to something subtly wrong (for example, asserting the output
ends with two newlines, or asserting a specific string that omits the
trailing newline entirely), while leaving `normalize.ts` itself completely
unmodified and correct.

Concretely (illustrative; confirm against the actual current test content
before applying):

```ts
// Before (correct):
expect(normalize(Buffer.from("hello\n\n\n"))).toBe("hello\n");

// After (planted bug -- the TEST's expectation is wrong, source is fine):
expect(normalize(Buffer.from("hello\n\n\n"))).toBe("hello\n\n");
```

This makes `npm test` fail with a clear assertion-mismatch diff, while the
actual `normalize()` behavior remains correct and matches its own doc
comment (Step 4: "append exactly one `\n`").

## How to apply

1. Create `scratch/eval-08-failing-ci-diagnosis-<date>` from the current
   branch tip.
2. Apply the wrong-assertion edit to `normalize.test.ts` on that branch;
   commit it as a single throwaway commit (needed so the scenario's own
   "CI is red on this branch" framing has a real commit to point at, not
   just an uncommitted working-tree change).
3. Run `npm test` and capture the actual failure output verbatim -- this
   is what gets pasted into the scenario's Input task message.
4. Start the scenario session on this branch per `runbook.md`.

## How to discard

After scoring, `git branch -D scratch/eval-08-failing-ci-diagnosis-<date>`
(local delete only, never pushed; the throwaway commit is discarded along
with the branch, never merged into any real branch). Confirm `npm test`
passes on the real working branch before starting the next scenario.
