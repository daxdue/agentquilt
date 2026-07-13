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
| 01 -- isolated bug fix | [done](claude-code/01-isolated-bug-fix-2026-07.md) (finished, clean) | not yet run |
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

- Claude Code scenarios scored: 1 of 6 minimum (1 of 12 total).
- Codex scenarios scored: 0 of 6 minimum (0 of 12 total).
- Proof-of-mechanics run per provider (D8 gate for Phase 8 `complete`):
  Claude Code side performed 2026-07-13 (scenario 01, self-administered
  by the orchestrator per runbook.md section 5/D7 -- see that run's Notes
  for the disclosed self-administration limitation). Codex side not yet
  performed.

## Cross-scenario findings (concrete pipeline improvements)

Populate this section as findings accumulate across multiple runs --
per the phase's own "failures produce concrete pipeline improvements"
acceptance criterion, a finding that recurs across scenarios or providers
belongs here, distinct from a single run's own "Follow-up" note in its
results file.

- From scenario 01 (Claude Code, 2026-07): runbook.md step 7's discard
  instruction should explicitly require reverting uncommitted working-tree
  changes, not just deleting the scratch branch -- an uncommitted edit
  survives a branch switch and was caught only by an explicit post-hoc
  `git status` check. See that run's results file for detail.
- From scenario 01 (Claude Code, 2026-07): runbook.md section 5 does not
  say whether an orchestrator-run scenario should delegate to an
  independent reviewer subagent for dimension 9 fidelity; this run skipped
  that step. Needs a decision before the next orchestrator-run scenario.
