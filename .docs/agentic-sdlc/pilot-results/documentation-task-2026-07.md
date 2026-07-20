# Pilot result: documentation-task -- Claude Code -- 2026-07

Phase 10 pilot instance (design doc: `pilot-tuning-and-operating-model.md`
section 3.5, D5). Not a Phase 8 numbered scenario -- filed here per D6
rather than under `evals/results/`, reusing `evals/results/TEMPLATE.md`'s
exact structure (see [evals/README.md](../evals/README.md) for why the two
are kept separate: this is real, organically-scoped work, not a planted
Phase-8 evaluation scenario).

- Task: fix the three stale "Proposal... Not yet built" status headers
  identified by Phase 9's own representative task
  ([phase-10-pipeline-cross-reference.md](../phase-10-pipeline-cross-reference.md)
  section 3) in `claude-code-pipeline.md`, `codex-pipeline.md`, and
  `guardrails-design.md`; fold `codex-pipeline.md`'s D1 revision
  (documented in `.codex/config.toml`'s own comments) and D6 override
  (documented in `guardrails-design.md` and
  `.codex/hooks/pretooluse-guard.sh`'s header) back into `codex-pipeline.md`'s
  own D1/D6 text; add the missing third commit (`e5e68a3`) to
  `phase-08-report.md`'s frontmatter `commits:` list.
- Provider: Claude Code (orchestrator session, per the coordinator's own
  direct, same-turn, named instruction for this specific pilot instance --
  not a spawned Phase Executor subagent).
- Provider version (coarse): Claude Code, 2026-07.
- Coarse date: 2026-07.
- Fixture applied: no (real repository state -- the three design documents'
  own actual, current text, and `phase-08-report.md`'s own actual,
  current frontmatter).
- Outcome: finished.

## Pilot metrics (per design doc section 4)

| # | Metric | Observation |
| - | ------ | ------------ |
| 1 | Task completion rate | 1 of 1 -- all four planned edits (3 status headers, 1 report frontmatter addition) completed. |
| 2 | First-pass test success | N/A in the code-test sense (documentation-only task, no code under test); the applicable equivalent -- the plain-ASCII scan -- did NOT pass first-pass: the initial edit to `claude-code-pipeline.md` introduced two em-dash characters (matching that file's own pre-existing, inconsistent house style, which itself uses 50 pre-existing em-dashes from before the strict plain-text policy was consistently enforced), caught by the standing verification step and corrected in a follow-up edit before commit. See Notes. |
| 3 | Number of human corrections | Zero substantive corrections -- the Maintainer/coordinator did not redirect or reject any part of this instance's content; the one self-caught fix (em-dash characters) was found by this instance's own verification step, not by human review. |
| 4 | Valid review findings | N/A -- no independent reviewer was delegated to for this small-profile documentation task (per `risk-and-approval-policy.md` section 4, a correctly classified small task carries no plan-approval gate and this repository's contracts do not require a formal REV-stage review for a status-header correction); self-verification only (plain-text scan, diff-scope check). |
| 5 | False-positive review findings | N/A -- see above; no review step ran to produce one. |
| 6 | Scope-creep incidents | Zero. `git diff --stat` confirmed only the four intended files changed, no other file touched. One in-scope judgment call is recorded, not scope creep: `claude-code-pipeline.md`'s own title line used a pre-existing em-dash predating the strict policy; since this instance was already editing that exact line (removing the stale "(Proposal)" suffix), the title's em-dash was normalized to `--` in the same edit, matching its two sibling documents' own already-compliant titles -- judged in-scope (same line, same document-currency purpose) rather than an unrelated drive-by fix. |
| 7 | Generated-file mistakes | Zero. No `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`, or `agentquilt.lock` was touched at any point -- confirmed via `git diff --stat` against those exact paths, empty. |
| 8 | Missed documentation changes | None identified as missed within this instance's own scope. One adjacent, NOT-yet-fixed staleness was found but deliberately left alone as out of this specific instance's scope: `codex-pipeline.md`'s own D7 (whether to build the 6 conditional specialists) was also found to read as an open decision in its original text despite being resolved (all 14 agents built) -- this was folded in as part of this same edit once discovered (see Notes), so it is not, in the end, a missed change, but is recorded here as a finding surfaced mid-task per the standing discipline (report, do not silently absorb without disclosure). |
| 9 | Approval-boundary violations | Zero. This documentation-currency fix required no approval gate under `risk-and-approval-policy.md` section 3 (it is not a public-interface, persisted-format, generated-output-semantics, new-dependency, destructive, or release-class change) -- correctly proceeded without stopping, and no gate trigger was discovered mid-flight that would have required one. |
| 10 | Cycle time | Session-relative, not independently timed: the edit sequence (locate exact current text for all four files, make five surgical edits across three design documents plus one report-frontmatter edit, run the plain-text verification, self-correct the one finding, re-verify) completed within the same working session as the broader Phase 10 segment 2 batch, interleaved with the ESLint pilot instance (this file's sibling). No standalone wall-clock figure isolates this instance alone from the rest of the segment's work; recorded as "not independently observed," matching rubric dimension 14's own "Not observed" option rather than fabricating a number. |
| 11 | Provider-specific notes | Ran entirely on Claude Code (the orchestrator session itself, under the coordinator's explicit same-turn instruction, per `evals/runbook.md` section 5's own orchestrator-participation conditions, all of which were satisfied: one specific instance named, explicit in-turn instruction, no subagent delegation). No Codex-side equivalent run was performed for this instance -- a genuine gap in dual-provider coverage for this specific pilot category, left open rather than backfilled with a synthetic Codex run, consistent with the "no forced synthetic exercise" standing constraint. |

## Notes

**Self-caught plain-text policy violation, disclosed rather than silently
fixed:** the first draft of the `claude-code-pipeline.md` status-header
edit introduced two em-dash characters, matching that document's own
pre-existing, unusually inconsistent house style (its original title line
and body text already used real em-dashes in 50 places, apparently
predating consistent enforcement of the repository's strict `--`-only
plain-text policy -- both `codex-pipeline.md` and `guardrails-design.md`,
by contrast, already used `--` correctly in their own original titles).
This instance's own standing verification step (`git diff | grep` for
non-ASCII characters on added lines only, the same check every prior
phase segment in this effort runs before committing) caught this on the
first post-edit check, before any commit, and it was corrected in place.
The correction was scoped narrowly: only the newly-added lines were fixed;
the file's other 48 pre-existing em-dash instances (in text this instance
did not otherwise touch) were left alone, per the same discipline Phase 9
segment 2 used for `handoff-contract.md`'s own pre-existing em-dashes --
fixing all 48 would be a second, larger, differently-scoped documentation
task (repo-wide claude-code-pipeline.md plain-text cleanup), not part of
this pilot instance's own bounded scope. One exception was made and is
disclosed: the file's own title line, which this instance was already
editing (to drop the stale "(Proposal)" suffix), was additionally
normalized from an em-dash character to `--` in the same edit, since it is the exact line
already being touched for the primary task and matches the analogous,
already-compliant title convention in `codex-pipeline.md` and
`guardrails-design.md`.

**A related, not originally scoped finding surfaced and folded in during
this instance's own D1 investigation:** `codex-pipeline.md`'s own D7 text
("Whether to also create `.codex/agents/*.toml` files for the 6
conditional specialists now... or defer them") read, in its original
form, as if this were still an open decision -- but a direct filesystem
check (`ls .codex/agents/` returning 14 files) confirmed it was resolved
long ago (all 6 specialists built alongside the 8 core agents). This is
the same stale-content pattern already targeted for D1 and D6 by this
instance's own primary task, just not originally named by Phase 9's
cross-reference (which flagged D1 and D6 specifically, not D7). Folded in
as part of this same edit rather than deferred to a second pass, since it
is the identical class of fix, in the identical document, discovered
during the identical investigation.

**Fidelity note:** unlike Phase 8's own scenario-1 run, this pilot
instance carries no self-administration fidelity concern of the same
kind -- there was no planted fixture to discover blind; the task was to
locate and correct real, already-existing staleness, which this instance
did by direct, cited reads of the current file contents (not from
memory or from Phase 9's report's own paraphrase alone) before editing
each one.

## Follow-up

1. `claude-code-pipeline.md` still contains 48 pre-existing em-dash
   characters outside the lines this instance touched (its original title
   and much of its body text) -- a candidate for a future, separately-scoped
   documentation-currency pass if the Maintainer wants full plain-text-policy
   compliance across this specific file, not fixed here since it is outside
   this instance's own bounded scope.
2. No Codex-side run of this same pilot instance was performed -- a
   dual-provider comparison point for "documentation task" (metric 11)
   remains a gap, listed here rather than silently left unaddressed.
3. This instance's own cycle time was not independently isolated from the
   rest of the Phase 10 segment 2 batch (metric 10) -- if precise cycle-time
   comparison across pilot instances becomes valuable later, future pilot
   instances should be timed as standalone sessions rather than interleaved
   ones.
