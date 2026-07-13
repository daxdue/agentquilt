# Fixture recipe: 04 -- deterministic output regression

Used by [scenarios/04-deterministic-output-regression.md](../scenarios/04-deterministic-output-regression.md).
Generation recipe (D3), applied on a scratch branch, discarded after the
scored run. The underlying golden-fixture tree
(`packages/agentquilt-cli/tests/fixtures/golden/`) is real and reused
as-is -- only the regression in the compiler is new.

## What to plant

Target function: `sortFragmentsBytelex()` in
`packages/agentquilt-cli/src/core/fragmentScanner.ts` (confirmed present
at the time this recipe was written, `sort()` call at approximately line
68). This function's own doc comment states the invariant directly: "Byte-
lex sort fragments... NO localeCompare() -- use byte comparison only,"
matching `CLAUDE.md`'s repository-wide rule ("No locale-aware sorting:
Fragment ordering uses Unicode code points only; never use
`localeCompare()`").

On the scratch branch, change the `Buffer.from(a.fileName).compare(...)`
byte-comparison call inside the "both have prefix" branch to a
locale-aware string comparison instead:

```ts
if (a.hasPrefix && b.hasPrefix) {
  return a.fileName.localeCompare(b.fileName); // BUG: locale-aware, violates the invariant
}
```

This produces a different fragment order than the byte-lex comparator for
any fragment set containing filenames that a locale-aware collation orders
differently from raw byte order (for example, filenames mixing digits and
certain punctuation, or non-ASCII characters if any golden fixture
includes them). Confirm which existing golden case under
`packages/agentquilt-cli/tests/fixtures/golden/` this actually flips the
order for before finalizing the scratch branch -- if the current fixture
set happens not to contain an order-sensitive case, add one small fixture
fragment pair to the scratch branch's copy of the golden tree whose
filenames are known to sort differently under `localeCompare` versus byte
comparison (a directory-only addition, still confined to the scratch
branch).

## How to apply

1. Create `scratch/eval-04-deterministic-output-regression-<date>` from
   the current branch tip.
2. Apply the one-line comparator change above to `fragmentScanner.ts`.
3. Run `npm test` and confirm at least one existing golden test now fails
   with an order-mismatch diff (not a content-mismatch diff) against its
   expected output under `golden/expected/`.
4. Capture the exact failing test name and its `npm test` output -- this
   is the "golden test X is failing" context a Maintainer would naturally
   have on hand when starting the scenario session (though the scenario's
   own input task deliberately does not require pasting it, since a real
   Maintainer might just say "the golden test is failing" without the
   full log).
5. Start the scenario session on this branch per `runbook.md`.

## How to discard

After scoring, `git branch -D scratch/eval-04-deterministic-output-regression-<date>`
(local delete only, never pushed). Confirm `npx agentquilt check` and
`npm test` both pass again on the real working branch before starting the
next scenario.
