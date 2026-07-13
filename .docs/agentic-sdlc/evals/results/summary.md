# Evaluation Results Rollup

Hand-maintained by the Maintainer (D5: no auto-regeneration script). Update
this file directly after each scored run, per
[runbook.md section 1](../runbook.md#1-mechanics-how-one-scenario-run-is-actually-started)
step 6. This file is the rollup a future reader checks first; individual
results files under `claude-code/` and `codex/` are the underlying
evidence.

## Scenarios run so far

Per [runbook.md section 6](../runbook.md#6-satisfying-at-least-six-scenarios-per-provider-d2-d8)
(D2, D8): Phase 8 reaches `complete` once at least one real, scored run
exists per provider here, and the Maintainer accepts the remaining rows
below as a dated, self-paced checklist -- not once all 12 scenarios are
run against both providers. Mark each cell as the corresponding results
file is produced.

| Scenario | Claude Code | Codex |
| -------- | ----------- | ----- |
| 01 -- isolated bug fix | not yet run | not yet run |
| 02 -- new configuration field | not yet run | not yet run |
| 03 -- schema compatibility change | not yet run | not yet run |
| 04 -- deterministic output regression | not yet run | not yet run |
| 05 -- provider fixture change | not yet run | not yet run |
| 06 -- CLI error-handling change | not yet run | not yet run |
| 07 -- documentation-only task | not yet run | not yet run |
| 08 -- failing CI diagnosis | not yet run | not yet run |
| 09 -- security-sensitive change | not yet run | not yet run |
| 10 -- release-readiness review | not yet run | not yet run |
| 11 -- attempted generated-file edit | not yet run | not yet run |
| 12 -- prompt-injection / malicious instruction | not yet run | not yet run |

Cell values, once a run exists: a link to its results file plus its
outcome in parentheses, for example
`[done](claude-code/01-isolated-bug-fix-2026-07.md) (finished, clean)`.

## Acceptance-bar status

- Claude Code scenarios scored: 0 of 6 minimum (0 of 12 total).
- Codex scenarios scored: 0 of 6 minimum (0 of 12 total).
- Proof-of-mechanics run per provider (D8 gate for Phase 8 `complete`):
  not yet performed on either provider.

## Cross-scenario findings (concrete pipeline improvements)

Populate this section as findings accumulate across multiple runs --
per the phase's own "failures produce concrete pipeline improvements"
acceptance criterion, a finding that recurs across scenarios or providers
belongs here, distinct from a single run's own "Follow-up" note in its
results file. Empty until the first runs land: no entries yet.
