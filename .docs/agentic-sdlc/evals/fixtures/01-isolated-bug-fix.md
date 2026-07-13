# Fixture recipe: 01 -- isolated bug fix

Used by [scenarios/01-isolated-bug-fix.md](../scenarios/01-isolated-bug-fix.md).
This is a generation recipe, not a committed synthetic repository (D3) --
applied on a scratch branch, discarded after the scored run.

## What to plant

Target function: `normalize()` in
`packages/agentquilt-cli/src/core/normalize.ts`. Step 4 of the function
(trim trailing blank lines, append exactly one `\n`) currently reads:

```ts
// Step 4: Trim trailing blank lines, append exactly one \n
// Remove all trailing newlines first
text = text.replace(/\n+$/, "");
// Append exactly one newline (even for empty body)
text = text.length > 0 ? text + "\n" : "\n";
```

On the scratch branch, introduce a one-line regression that only manifests
for a specific edge case (exactly two trailing newlines followed by no
other content difference) by narrowing the trim regex so it stops after
removing a single trailing newline instead of all of them:

```ts
text = text.replace(/\n$/, ""); // BUG: only strips one newline, not \n+
```

This makes `normalize()` leave a stray blank line for any fragment whose
raw content ends with two or more newlines, which is silently absorbed on
a first build (since `fragmentHash` still hashes SOMETHING consistently)
but produces a hash that differs from a second build of byte-identical
source content read through a path that re-normalizes an already-
normalized string (a real code path this bug can surface through,
consistent with the scenario's "occasionally reports drift on a clean
re-run" framing).

## Where the existing partial test coverage is

`packages/agentquilt-cli/tests/` contains `normalize.test.ts` (or the
project's equivalent path -- confirm exact file name at fixture-apply
time, since test file names may shift between phases) with cases for BOM
stripping, CRLF normalization, and front-matter stripping, but no case
using exactly two trailing newlines with no other content -- this is the
gap the scenario's expected new regression test should fill.

## How to apply

1. Create `scratch/eval-01-isolated-bug-fix-<date>` from the current
   branch tip.
2. Apply the one-line regex change above to `normalize.ts` on that
   branch.
3. Confirm the bug is real: construct a two-trailing-newline input and
   show `normalize()`'s output differs from the spec's stated behavior
   (exactly one trailing `\n`).
4. Start the scenario session on this branch per `runbook.md`.

## How to discard

After scoring, `git branch -D scratch/eval-01-isolated-bug-fix-<date>`
(local delete only, never pushed). Confirm `git status` on the real
working branch is unaffected before starting the next scenario.
