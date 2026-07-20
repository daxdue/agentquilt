# Phase 10 input -- Pipeline cross-reference (Phase 9 representative task)

Produced by a four-way parallel read-only investigation, dispatched by the
orchestrator directly under Phase 9's coordination contract
([controlled-multi-agent-parallelism.md](controlled-multi-agent-parallelism.md)
section 5), as that phase's acceptance-criteria "large representative task"
(section 8). This is a real deliverable, not a synthetic benchmark exercise:
it answers the question Phase 10 (pilot tuning and operating model) needs
answered first -- what is actually built and stable versus still-open across
Phases 4-8.

Batch: "Phase 10 pipeline cross-reference." Four subagents (`repository-analyst`,
Claude Code, `run_in_background: true`), one per pipeline area, dispatched
from one task-assignment batch with a written ownership manifest (all
read-only, overlapping reads of shared contracts explicitly permitted). Each
subagent returned a scoped Repository Investigation per
`investigation-contract.md` section 4. This document is the section 5.10
merged synthesis.

## 1. Verification performed before acceptance

Per section 5.7 of the coordination contract, one targeted spot-check was
performed against the single most load-bearing claim in each subagent's
output before it was accepted into this synthesis. All four passed:

| Subagent | Claim spot-checked | Result |
| -------- | ------------------- | ------ |
| 1 (Claude Code pipeline) | `claude-code-pipeline.md`'s header still reads "Status: Proposal... Not yet built" while `.claude/skills/` is fully committed | CONFIRMED -- header text re-read directly, matches verbatim; `git ls-tree -r HEAD -- .claude/skills` confirms 6 committed skill files |
| 2 (Codex pipeline) | `.codex/config.toml`'s comment documents a revision to decision D1 not reflected in `codex-pipeline.md` itself | CONFIRMED -- comment re-read directly, matches subagent's quotation verbatim |
| 3 (GitHub/CI integration) | D8 (lint/format) remains open: no ESLint config exists anywhere in the tracked tree, CI steps are non-blocking | CONFIRMED -- `find` for `*eslintrc*`/`eslint.config*` returned zero results; `test.yml`'s PR-comment step text re-read directly, states the same |
| 4 (Evaluations and benchmarks) | `phase-08-report.md`'s frontmatter is stale: lists only 2 commits, missing a later third commit | CONFIRMED -- frontmatter re-read directly shows `commits: [2be16d2, 2e3fbba]`; `git log` shows a third, later commit `e5e68a3` not reflected |

No spot-check contradicted its subagent's claim. No subagent output was
rejected or required re-dispatch.

## 2. Conflicts encountered

**None.** No two subagents reported disagreeing facts about the same claim
(each was scoped to a disjoint area, and no shared-fact overlap produced a
contradiction). Per section 5.6, this is stated explicitly rather than
silently assumed: the four investigations independently converged on a
*related, not contradictory* pattern (section 3 below), which is a
cross-cutting finding, not a conflict requiring escalation.

## 3. Cross-cutting finding: stale "Proposal, not yet built" status headers

**The single most consequential finding of this fan-out** is one no single
sequential investigation would necessarily have surfaced as a pattern rather
than an isolated one-off: **three of the four investigated design documents
carry a status header claiming "Proposal... awaiting Maintainer approval...
not yet built," while the artifacts they specify are already built,
committed, and in active use.**

- `claude-code-pipeline.md` (Phase 4): header unchanged since its one and
  only commit (`a01d46e`), which *also* delivered the skills/commands it
  claims are not yet built. All 6 skills, both commands, and the settings.json
  guardrail block are committed and confirmed live (a Bash guard hook fired
  mid-investigation against subagent 1 itself).
- `guardrails-design.md` (Phase 6): same pattern -- its own D2 decision (the
  `PreToolUse` hook) is the exact mechanism already committed and firing.
- `codex-pipeline.md` (Phase 5): same pattern, plus a substantive content
  divergence, not just a status-line one -- decision D1 was later revised
  (segment 3 found the originally-proposed `[permissions.read-only-with-checks]`
  attachment mechanism does not exist in Codex's TOML schema) and D6 was
  later overridden by Phase 6's guardrails work, but neither revision is
  reflected in `codex-pipeline.md` itself. A reader trusting that document
  alone as the current spec would build the wrong thing.
- By contrast, `agent-portfolio.md` (Phase 3) and `github-ci-integration.md`
  (Phase 7) both correctly show their actual delivered status ("Status:
  Active... approved by the Maintainer..." and `status: complete`
  respectively) -- so this is not a universal convention in this repository,
  it is an inconsistency: some phase deliverables get a post-build status
  correction, others do not.
- A related but distinct instance: `phase-08-report.md` itself (not a
  design doc, but the phase's own execution record) is stale in the same
  direction -- missing a later commit (`e5e68a3`) and its `open_questions`
  field asserting something ("not yet performed") that a later commit
  superseded without the report being updated to match.

**Why this matters for Phase 10:** if Phase 10's pilot-tuning work reads
these design docs as the current spec (the natural thing to do), it will
work from a superseded understanding of D1/D6 for Codex and will not know
that Phase 4/6's guardrails are already live for Claude Code. The
authoritative state currently lives scattered across commit history, inline
code comments (`.codex/config.toml`, `pretooluse-guard.sh` headers), and this
cross-reference -- not in the design documents' own prose.

**Recommendation, not a fix applied here (per the standing instruction to
surface discovered issues rather than silently correct them mid-task):**
Phase 10, or a small dedicated documentation-currency task before it, should
update the status headers of `claude-code-pipeline.md`, `codex-pipeline.md`,
and `guardrails-design.md` to reflect actual delivered state (matching
`agent-portfolio.md`'s and `github-ci-integration.md`'s pattern), fold the
`.codex/config.toml` D1 revision and the Phase 6 D6 override back into
`codex-pipeline.md`'s own text, and add a "segment 3" entry to
`phase-08-report.md` recording the `e5e68a3` proof-of-mechanics commit. Each
of these, per the four subagents' own classification confirmations, is a
small-profile, documentation-only change.

## 4. Per-area summary

### 4.1 Claude Code pipeline (Phase 4)

**Delivered and stable:** 6 skills (`analyze-issue`, `plan-change`,
`develop-issue`, `implement-task`, `review-tree`, `fix-ci`), 2 commands
(`/prepare-pr`, `/release-readiness`), `.claude/settings.json` guardrails
(generated-file deny, absolute-rule deny, secret-filename deny), and a
Phase-6 per-agent Bash-scoping hook -- all committed, all confirmed live
(the hook fired against the investigating subagent itself mid-run).

**Open gaps:** the status-header staleness (section 3); a self-acknowledged
command-chaining bypass in the Bash guard hook ("a caller could still chain
commands with `&&` or `;` to smuggle a denied command after an allowed
prefix," `pretooluse-guard.sh:73-76`); the Phase-6 `Stop`-hook fallback for
skipped-validation detection (D4) remains an explicitly deferred, unbuilt
guardrail.

### 4.2 Codex pipeline (Phase 5)

**Delivered and stable:** 14 custom agents (8 core + 6 specialists, all
built now per D7's resolution), 8 skills under `.agents/skills/` with
`agents/openai.yaml` sidecars, `.codex/config.toml` (read-only session
default), `.codex/hooks.json` + `pretooluse-guard.sh` (global, not per-agent,
generated-file/absolute-rule/secret-filename guard). Naming diverges from
Claude Code by design: `repository-explorer` (not `repository-analyst`),
`test-reviewer` (not `test-engineer`, narrower-scoped to read-only adequacy
review).

**Open gaps:** the status-header staleness plus the substantive D1/D6
content divergence (section 3); whether the section-10 non-interactive
validation plan (`codex exec` checks) has ever actually been run is
unconfirmed from the repository alone; whether the hook has ever been
empirically exercised in a live Codex session is unconfirmed.

### 4.3 GitHub/CI integration (Phase 7)

**Delivered and stable:** 6 GitHub issue forms + chooser config, a rewritten
13-item PR template, a consolidated `test.yml` (deduplicating former
`test.yml`/`pr-review.yml` overlap), corrected `intake.yml` and `release.yml`
(stale agent names fixed, a fake always-OK risk-register check replaced with
a real one), `.github/dependabot.yml`, and `github-provider-handoff.md`
documenting the `gh`-CLI/native-MCP handoff mechanism. This is the one area
whose own status record (`phase-07-report.md`: `status: complete`) matches
reality.

**Open gaps:** D8 (lint/format enforcement) remains open -- no ESLint config
exists anywhere in the tracked tree, confirmed directly this session; D7
(branch protection / required status checks on `main`) remains
unconfigured, last confirmed off 2026-07-13, not re-verified live this
session (would require a `gh api` call, out of read-only scope); coverage
threshold enforcement (part of D5) remains visible-only, not blocking;
secret-scanning/push-protection toggle state was never directly confirmed,
only assumed from GitHub's public-repo default; no live GitHub Actions run
has yet exercised any of the corrected workflow files.

### 4.4 Evaluations and benchmarks (Phase 8)

**Delivered and stable:** 12 scenario files, a 14-dimension hybrid rubric,
7 fixture-generation recipes, a six-part Maintainer runbook with an
explicitly guarded orchestrator-participation section, and a hand-maintained
results process. No automation, scorer, or runtime was added, matching the
phase doc's own prohibition.

**Open gaps:** exactly one scored run exists (scenario 01, Claude Code,
self-administered, disclosing its own fidelity limitation); the Codex-side
proof-of-mechanics run has not happened; `phase-08-report.md` itself is
stale (section 3); two follow-up items from the one existing run remain
unresolved in `runbook.md` (the discard-step wording gap, and whether an
orchestrator-run scenario must delegate to an independent reviewer for
dimension 9 fidelity) -- both were disclosed at the time, not silently
fixed, and neither has been acted on since.

## 5. Measured benefit of running this as a fan-out

Per section 5.10's requirement to state the measured benefit: four
substantial, genuinely disjoint documents (586 + 883 + 758 + 1150 = 3,377
lines across the four primary sources alone, before their cross-referenced
companion contracts) were each read in full and cross-checked against the
actual repository state in one parallel round-trip, rather than four
sequential deep-reads. Wall-clock duration for the four subagents ranged
from roughly 106 to 184 seconds each (per their own reported durations);
run sequentially, the four would sum to the total of all four durations
rather than the longest single one. Beyond raw time: the cross-cutting
finding in section 3 above -- a systemic documentation-staleness pattern
spanning three of the four investigated areas -- was only visible *because*
all four investigations' outputs were compared side-by-side during
synthesis; a single sequential investigator working through one document at
a time, reporting each as it finished, would have been substantially less
likely to notice and name the pattern across areas before finishing all
four, since the reason for noticing it is precisely that it recurs.

## 6. Provenance

Each finding in this synthesis traces to its originating subagent's full
Repository Investigation (recorded in the orchestrator's own session
transcript, not persisted separately as a file per this batch's task
assignment, which specified subagents report back in their final message
rather than write a file). Sections 4.1-4.4 above are condensed from, and
faithful to, those four full investigations; nothing in this synthesis
overrides or silently drops a finding either investigation reported --
every open gap named in section 1 of this document's per-area findings is
carried through here.
