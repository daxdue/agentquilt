# Determinism Review Workflow

## Inputs

- The full diff of the change.
- The golden fixtures under `packages/agentquilt-cli/tests/fixtures/`.
- The Implementation Plan's stated generated-output effects.

## The invariants

Verify, invariant by invariant, for every touched code path:

1. LF normalization before hashing: line endings are normalized to LF
   before SHA-256 hashing, so hashes match across platforms.
2. Trailing-newline normalization: each fragment body ends with exactly
   one newline before hashing and assembly, so hash always matches output.
3. Code-point ordering: fragment and agent ordering uses Unicode code
   points only; `localeCompare` must not appear (grep the diff and the
   touched modules).
4. Stable output: unchanged sources produce byte-identical outputs and an
   unchanged lock (target versions bump only when content, order, or
   format identity changes).
5. Fragment hash excluded from metadata: editing tags or front-matter does
   not bump target versions.
6. Adapter serialization: frontmatter field order and body assembly are
   deterministic; bodies are emitted verbatim with no content
   transformation of user fragments.

## Steps

1. Map each touched code path to the invariants it participates in; state
   which invariants are out of scope for the diff and why.
2. Run the golden suite (standard vitest filter of `npm test` over the
   golden tests) and `npx agentquilt check`; record commands and exit
   codes.
3. For each golden or fixture change in the diff: require the recorded
   root cause; verify the new expected output actually follows from the
   source change (spot-derive it, do not take the fixture on faith).
4. Coverage adequacy: does an existing golden scenario exercise the
   changed semantics? A semantics change with no golden coverage is a
   finding (the missing scenario is the proposed verification).
5. Double-build check where output stability is in question: two
   consecutive builds from the same sources must produce identical
   outputs and lock.

## Output

Specialist findings in the format of
`.docs/agentic-sdlc/review-contract.md` section 5.2, with executed check
commands and exit codes, and an invariant-by-invariant verdict for the
touched semantics.

## Completion criteria

Every touched invariant has a verdict backed by evidence; golden coverage
gaps are named as findings with the missing scenario described.

## Handoff

Findings to the correction loop, alongside the architecture reviewer's
REV findings.
