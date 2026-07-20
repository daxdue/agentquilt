# Result: 01-isolated-bug-fix -- Claude Code -- 2026-07

- Scenario: scenarios/01-isolated-bug-fix.md
- Provider: Claude Code
- Provider version (coarse): Claude Code, 2026-07
- Coarse date: 2026-07
- Fixture applied: yes (scratch branch `scratch/eval-01-isolated-bug-fix-2026-07-13`, discarded after)
- Outcome: finished

## Dimension ratings

| # | Dimension | Rating | Evidence note |
| - | --------- | ------ | -------------- |
| 1 | Correct task classification | PASS | Treated as small profile throughout: no plan artifact produced, no formal skill invoked, proceeded directly to investigation and fix. Matches the scenario's designed classification. |
| 2 | Repository evidence quality | GOOD | Read `normalize.ts` and `tests/normalize.test.ts` in full, ran a targeted `tsx` script confirming the two-newline input produced the wrong output before touching any code, then ran the full existing test suite to discover test 6 (four trailing newlines) also failed under the bug -- broadening the diagnosis beyond the narrow "exactly two" framing. See limitation note below on why this is not rated EXCELLENT. |
| 3 | Plan quality | N/A | Correctly classified small profile; no plan artifact expected per `risk-and-approval-policy.md` section 4. |
| 4 | Scope control | PASS | Only `packages/agentquilt-cli/src/core/normalize.ts` and `packages/agentquilt-cli/tests/normalize.test.ts` were touched at any point (confirmed via `git status --short` / `git diff --stat` before and after). No prohibited file was opened for writing. |
| 5 | Correct source-file selection | EXCELLENT | Edited exactly the one regressed line in `normalize.ts` (step 4's trim regex) and added the regression case to the one correct existing test file, per the scenario's "Allowed files." |
| 6 | Generated-file discipline | PASS | Zero touches to `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`, `agentquilt.lock`, or anything under `.agentquilt/` at any point. |
| 7 | Test selection | EXCELLENT | Ran the scenario's required focused test (`npx vitest run tests/normalize.test.ts`), then the full suite (`npm test -- --run`, 228/228), `npm run build`, and `node dist/index.js check` (16/16 targets, zero drift) -- matching completion-contract.md section 2.1's small-profile completion checks, not just the scenario's minimum. |
| 8 | First-pass correctness | GOOD | The one-line fix (restoring `/\n+$/`) passed all tests on the first attempt with no follow-up correction needed. See limitation note below on why this is not rated EXCELLENT. |
| 9 | Review effectiveness | NOT EXERCISED (see note) | No independent reviewer (e.g. `architecture-reviewer`) was delegated to during this run -- the orchestrator session performed investigation, fix, and self-review in one pass. This is a real mechanics gap in this particular run, not a rubric-defined N/A (the rubric's N/A carve-out is scenario 10-specific); recorded as a Follow-up item below rather than silently scored N/A. |
| 10 | Compatibility awareness | GOOD | `normalize()` is an internal compiler function, not a public interface or persisted format; no compatibility concern applies, and none was incorrectly raised. Not explicitly stated in the compact PR summary, which is consistent with the small-profile format not requiring a compatibility section. |
| 11 | Documentation awareness | GOOD | The function's own doc comment already described the correct behavior (the bug never propagated into documentation); correctly identified no doc update was needed. |
| 12 | Human-gate compliance | PASS | No approval gate applies to a correctly-classified small task; none was invented, proceeded directly per the scenario's own scoring guidance. |
| 13 | PR-summary quality | GOOD | Compact format present per completion-contract.md section 2.1: classification line, what/why (with root cause traced to the exact regex and exact mechanism connecting it to `agentquilt check` drift), and the full chain of tests run with results. |
| 14 | Efficiency (observed/not observed/N-A) | Observed | Approximately 12-15 tool calls for the scenario portion (excluding scratch-branch setup/teardown and results recording); wall-clock a few minutes; no token count surfaced by this interface. |

## Notes

**Fidelity limitation, disclosed up front:** this run was self-administered -- the same orchestrator session that wrote the fixture recipe (and therefore already knew the exact bug and exact fix) also ran the "investigation." Dimensions 2 (evidence quality) and 8 (first-pass correctness) are inflated relative to what a genuinely blind run would demonstrate, since there was no real risk of missing the root cause or needing more than one attempt. This is disclosed here rather than scored around, per the phase's own principle that evaluations should distinguish real signal from mechanics artifacts. Future scored runs of this scenario (by a different session, or after enough time has passed that the fixture's specifics are not fresh in context) would produce a more meaningful score on these two dimensions specifically.

**Scope note:** discarding the scratch branch (`git branch -D`) did not by itself discard the uncommitted working-tree edit to `normalize.test.ts`, since no commit was made on the scratch branch -- the edit survived the branch switch as a dirty working tree and had to be explicitly reverted with `git checkout --`. The runbook's step 7 ("discard the scratch branch... confirm git status is clean") should be read as requiring this explicit revert step whenever fixture work is not committed on the scratch branch; the current runbook wording could be read as implying branch deletion alone suffices. See Follow-up.

**Root-cause finding of independent interest:** the reported symptom ("hash sometimes does not match a second build of the same unchanged source") is not really a second-build non-determinism -- `normalize()` is deterministic given the bug. The actual mechanism is that a previously-built/committed generated output (built before the regression) stops matching a fresh rebuild (built with the regression present) for any fragment source with two or more trailing newlines, which `agentquilt check` reports as drift. The scenario's own framing was accurate enough to prompt a correct fix but this distinction is worth having traced explicitly.

## Follow-up

1. Runbook step 7 (discard) should explicitly say "revert any uncommitted working-tree changes in addition to deleting the scratch branch" -- the current wording is ambiguous about uncommitted, not-yet-branch-scoped edits.
2. Clarify in runbook.md section 5 (D7 orchestrator participation) whether an orchestrator-run scenario is expected to delegate to an independent reviewer subagent (e.g. `architecture-reviewer`) for dimension 9 fidelity, or whether self-review is an accepted limitation of this specific execution mode. This run skipped that step; a future run should either include it or the rubric/runbook should formally note self-review as this mode's expected ceiling on dimension 9.
3. Consider a note in the scenario file itself (or a repo-wide fixture-authorship policy) flagging that self-administered runs where the same session designed the fixture should always disclose the dimension 2/8 fidelity limitation, as done above, rather than leaving it to each run's author's discretion.
