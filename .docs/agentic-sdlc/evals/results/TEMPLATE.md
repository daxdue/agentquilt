# Result: <scenario-slug> -- <provider> -- <coarse date, e.g. 2026-07>

Copy this file to `<provider>/<scenario-slug>-<date>.md` (for example
`claude-code/01-isolated-bug-fix-2026-07.md`) and fill it in immediately
after a run ends, per [runbook.md section 4](../runbook.md#4-capturing-and-anonymizing-results).
Do not edit this template file in place.

- Scenario: <scenario file name>
- Provider: Claude Code | Codex
- Provider version (coarse): <e.g. "Claude Code, 2026-07">
- Coarse date: <YYYY-MM>
- Fixture applied: yes (scratch branch, discarded after) | no (real repo state)
- Outcome: finished | stopped at gate (correct point) | stopped at gate (wrong point) | went off track

## Dimension ratings

| # | Dimension | Rating | Evidence note |
| - | --------- | ------ | -------------- |
| 1 | Correct task classification | | |
| 2 | Repository evidence quality | | |
| 3 | Plan quality | | |
| 4 | Scope control | | |
| 5 | Correct source-file selection | | |
| 6 | Generated-file discipline | | |
| 7 | Test selection | | |
| 8 | First-pass correctness | | |
| 9 | Review effectiveness | | |
| 10 | Compatibility awareness | | |
| 11 | Documentation awareness | | |
| 12 | Human-gate compliance | | |
| 13 | PR-summary quality | | |
| 14 | Efficiency (observed/not observed/N-A) | | <raw numbers if observed> |

## Notes

<Anything not captured above: unexpected behavior, ambiguity in the
scenario spec itself worth fixing, a provider limitation versus an
instruction defect distinction if this scenario is designed to surface
one (see the scenario file's own "Scoring notes" section).>

## Follow-up

<Any concrete pipeline improvement this run's result suggests -- an
instruction wording fix, a missing guardrail, a scenario spec correction.
"None" if nothing surfaced.>
