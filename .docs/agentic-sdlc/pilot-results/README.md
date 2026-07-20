# Phase 10 pilot results

Pilot-instance evidence for Phase 10 (pilot, tuning, and operating model)
that does NOT map onto one of Phase 8's 12 numbered evaluation scenarios --
per D6 of [pilot-tuning-and-operating-model.md](../pilot-tuning-and-operating-model.md)
section 9, filed here in a new, parallel directory rather than under
[evals/results/](../evals/README.md), reusing
[evals/results/TEMPLATE.md](../evals/results/TEMPLATE.md)'s exact structure.
Pilot instances that DO map onto an existing Phase 8 scenario number (for
example, "release preparation" onto scenario 10) are filed under
`evals/results/<provider>/` directly instead, alongside Phase 8's own
scored runs, not duplicated here.

## Low-risk bug -- cross-reference, not duplicated (D1)

Per D1 (design doc section 9), Phase 10's "low-risk bug" pilot category is
satisfied by reusing Phase 8's own scenario-1 scored run, relabeled with
Phase 10's own lens rather than re-run:

- **Result file**: [evals/results/claude-code/01-isolated-bug-fix-2026-07.md](../evals/results/claude-code/01-isolated-bug-fix-2026-07.md)
- **Original purpose (Phase 8)**: score the agentic pipeline's quality
  against the 14-dimension rubric for a synthetic-but-real, deliberately
  planted bug fix (an off-by-one in `normalize.ts`'s trailing-newline
  handling).
- **Phase 10's reused lens**: "did the process work in practice" -- yes.
  The run demonstrates a real, end-to-end small-profile lifecycle
  traversal on this exact repository (investigation via a direct,
  targeted reproduction script; a one-line source fix; the scenario's own
  required focused test plus the full 228-test suite plus a build plus a
  drift check; a compact PR Summary) with zero scope creep, zero
  generated-file touches, and zero human corrections needed. This
  satisfies Phase 10's "full lifecycle used on real work" acceptance
  criterion for the low-risk-bug category specifically.
- **Disclosed limitation, carried over unchanged from Phase 8's own
  results file**: the run was self-administered (the same session that
  planted the fixture also "investigated" it), which the original results
  file's own Notes section discloses as inflating dimensions 2 (evidence
  quality) and 8 (first-pass correctness) relative to what a genuinely
  blind run would demonstrate. Phase 10 does not re-run this scenario to
  resolve that limitation -- per D1's own explicit caveat, a second,
  genuinely blind, real low-risk-bug instance should still be sought
  (deferred to a Maintainer-paced checklist item, per D2, since no such
  bug is currently on record) before treating this pilot category as
  fully closed on its own strongest possible evidence.
- **No new file was written for this cross-reference beyond this pointer
  note** -- per the coordinator's own explicit instruction, the original
  result is not duplicated or re-run.

## Pilot instances recorded in this directory

- [documentation-task-2026-07.md](documentation-task-2026-07.md) -- the
  documentation-currency fix (three stale pipeline-doc status headers,
  the Codex D1/D6/D7 content fold-back, the `phase-08-report.md`
  frontmatter correction).
- [medium-feature-eslint-config-2026-07.md](medium-feature-eslint-config-2026-07.md) --
  the ESLint-configuration gap closure (Phase 7's D8).

## Still deferred (per the design doc's own pilot plan, section 3, and the
coordinator's own segment-2 scope, which named only the documentation-task
and medium-feature instances plus the D1 cross-reference for this segment)

- Low-risk bug (beyond the D1 cross-reference above): a second, genuinely
  blind real instance -- Maintainer-paced, next real GitHub issue.
- Provider-output change: deferred to Phase 8's own scenario 5, run at the
  Maintainer's own pace via `evals/runbook.md`.
- CI failure: deferred to Phase 8's own scenario 8, same mechanism.
- High-risk architecture/schema: deferred indefinitely, explicit separate
  Maintainer gate required, no substitute constructed (D3).
- Refactor (the two disclosed `evals/runbook.md` wording gaps, design doc
  section 3.3): not executed this segment -- the coordinator's segment-2
  scope named only the documentation-task and medium-feature instances;
  remains a candidate for a later segment.
- Release preparation (design doc section 3.7): not executed this
  segment -- the coordinator's segment-2 scope did not name it; if run
  later, would file under
  `evals/results/claude-code/10-release-readiness-review-<date>.md` (the
  Phase 8 scenario-10 vehicle), not in this directory.
