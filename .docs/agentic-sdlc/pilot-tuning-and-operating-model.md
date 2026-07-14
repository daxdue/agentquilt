# Agentic SDLC -- Pilot, Tuning, and Operating Model (Design)

Date: 2026-07-13
Status: Proposal (Phase 10 segment 1 deliverable; awaiting Maintainer
decisions on D1-D9 below before segment 2 executes any pilot instance,
applies any tuning, or writes the final operating-model / maintenance
documents this design specifies). This is the FINAL phase (0-10) of the
agentic-SDLC self-improvement effort.
Companion documents: [phase-10-pipeline-cross-reference.md](phase-10-pipeline-cross-reference.md)
(Phase 9's own representative task -- the real, ready-made four-way
investigation this design treats as primary input, not re-derived),
[controlled-multi-agent-parallelism.md](controlled-multi-agent-parallelism.md)
(Phase 9 -- the coordination contract this document's "when to use multiple
agents" operating-model topic cross-references rather than re-designs),
[evaluations-and-benchmarks.md](evaluations-and-benchmarks.md) and
[evals/](evals/) (Phase 8 -- the scenario pack, 14-dimension rubric, runbook,
and one scored run this design's pilot/metrics plan reuses rather than
duplicating), [agent-portfolio.md](agent-portfolio.md) (Phase 3 -- the
14-agent portfolio and its own 41-directory retirement history),
[claude-code-pipeline.md](claude-code-pipeline.md) and
[codex-pipeline.md](codex-pipeline.md) (Phases 4-5 -- both provider
pipelines, both carrying the stale header this design's own tuning plan
addresses), [github-ci-integration.md](github-ci-integration.md) (Phase 7 --
the one design doc whose own status header is current, and the source of
the D7/D8 gaps this design treats as pilot-shaped candidates),
[github-provider-handoff.md](github-provider-handoff.md) and
[risk-and-approval-policy.md](risk-and-approval-policy.md) (the two
remaining "final operating model" source documents not yet cited above).

## 1. Purpose and scope

Phase 10 turns nine phases of built infrastructure -- lifecycle contracts, a
14-role agent portfolio, two provider pipelines, provider-native
guardrails, GitHub/CI integration, an eval scenario pack, and a multi-agent
coordination contract -- into a practical, maintainable development system,
by (a) actually using it on real work, (b) tuning it from evidence, and (c)
documenting the operating model and maintenance plan a future Maintainer or
contributor needs to run it going forward. This is a design-only segment:
it proposes the pilot plan, metrics plan, tuning plan, and the two final
documents' outlines, and stops at nine lettered decision points before any
of that plan is executed.

Binding constraints carried over from the master prompt, the phase doc, and
`execution-model.md`, not repeated at each section below: development
infrastructure only, no AgentQuilt product feature, no telemetry service,
no custom execution runtime, human approval required for the gate triggers
in `execution-model.md` section 7, plain ASCII text throughout (`--` not an
em dash), local only (no push, no PR, no publish), generated files never
hand-edited, and -- specific to this segment -- do not silently fix any of
the already-known gaps (stale headers, D8 lint/format, D7 branch
protection) discussed below; this segment designs the pilot approach, it
does not execute fixes.

## 2. Current-state findings

Verified 2026-07-13 against the working tree on
`refactor/agentic-sdlc-boundary-cleanup` (clean; Phase 9's two commits,
`5a1c8f4` and `34b8127`, are the most recent history; `state.json` shows
Phase 8 still `awaiting_approval`, not `complete`, while Phases 9 and 10 are
already `in_progress`/underway -- a pre-existing orchestrator-level fact,
noted here because it affects D9 below, not something this segment
resolves).

### 2.1 What the prior nine phases already provide

- **A rationalized 14-agent portfolio** (`agent-portfolio.md`, Phase 3):
  8 core lifecycle roles (`repository-analyst`, `implementation-planner`,
  `feature-implementer`, `test-engineer`, `architecture-reviewer`,
  `regression-reviewer`, `documentation-reviewer`, `release-reviewer`) plus
  6 conditional specialists (`security-review`, `schema-design`,
  `deterministic-output`, `eval-designer`, `supply-chain-risk`,
  `ambiguity-detector`), reduced from 46. Section 5 already documents a
  routing matrix by profile (5.1: small/standard/high-risk stage sequences)
  and by task type (5.2: ~12 task-type rows mapped to classification, core
  routing, and specialist engagement), with an explicit mid-flight
  reclassification rule. Section 9.3 lists, by name, all 41 retired
  directories. **This means two of Phase 10's own acceptance criteria --
  "default small, standard, and high-risk workflows are established" and
  "obsolete agent definitions are removed or archived" -- are already fully
  satisfied by Phase 3's own delivered work**, not something this phase
  needs to invent; see section 8 below for the direct verification.
- **Two provider pipelines, both built and live**, per Phase 9's own
  four-way cross-reference (`phase-10-pipeline-cross-reference.md`, section
  4.1-4.2): Claude Code has 6 skills, 2 commands, and `.claude/settings.json`
  guardrails (generated-file deny, absolute-rule deny, secret-filename
  deny, a per-agent Bash-scoping hook), all committed and confirmed live (a
  guard hook fired against Phase 9's own investigating subagent mid-run).
  Codex has 14 custom agents (8 core + 6 specialists -- confirmed by direct
  `ls .codex/agents/` returning 14 files, resolving `codex-pipeline.md`'s
  own still-open-looking D7 in the design doc's stale text), 8 skills under
  `.agents/skills/` (confirmed directly: `analyze-issue`, `fix-ci`,
  `implement-task`, `plan-change`, `prepare-pr`, `release-readiness`,
  `review-tree`, `standard-development`), `.codex/config.toml`, and
  `.codex/hooks.json` + `pretooluse-guard.sh`. **Both pipelines' own design
  documents (`claude-code-pipeline.md`, `codex-pipeline.md`) still carry a
  "Proposal... Not yet built" status header**, confirmed by direct read of
  both files' first ten lines this segment -- this is real, live staleness,
  not a stale claim inherited secondhand from Phase 9.
- **GitHub/CI integration, built and its own status header accurate**
  (`github-ci-integration.md`, Phase 7): 6 issue forms, a 13-item PR
  template, a consolidated `test.yml`, corrected `intake.yml`/`release.yml`,
  `dependabot.yml`, and `github-provider-handoff.md`. This is the one
  pipeline document whose header correctly says "Built" rather than
  "Proposal" -- confirmed directly, contrasted with the three stale headers
  above. It also carries two disclosed, live, still-open gaps: **D7**
  (branch protection / required status checks on `main`: confirmed off via
  `gh api`, 404, a named-but-unexecuted Maintainer follow-up) and **D8**
  (no ESLint config exists anywhere in the tracked tree; `prettier --check`
  reports 50 files with formatting issues; both wired into `test.yml` as
  `continue-on-error: true`, informational only).
- **A 12-scenario eval pack with a 14-dimension rubric and one scored run**
  (`evaluations-and-benchmarks.md`, `evals/`, Phase 8): 12 scenario specs
  covering categories that overlap substantially with Phase 10's own 8
  pilot categories (see section 3 below for the exact mapping), a hybrid
  PASS/FAIL + 4-point-ordinal + observed/not-observed rubric, a 7-fixture
  generation-recipe set, a Maintainer-paced runbook, and exactly one
  completed scored run: scenario 01 (isolated bug fix), Claude Code,
  self-administered, disclosing its own fidelity limitation (the same
  session that planted the fixture also "investigated" it, inflating
  dimensions 2 and 8). `evals/results/summary.md` records 1 of 6 minimum
  Claude Code scenarios scored, 0 of 6 Codex, and two disclosed, unresolved
  runbook follow-ups (the discard-step wording gap; the dimension-9
  reviewer-delegation ambiguity). **Phase 8 itself remains
  `awaiting_approval` in `state.json`, not `complete`**, as of this
  segment's own read -- a fact this design treats as live context (D9
  addresses it directly), not something this segment resolves on Phase 8's
  behalf.
- **A multi-agent coordination contract, approved and committed but
  empirically exercised only once** (`controlled-multi-agent-parallelism.md`,
  Phase 9): a nine-part contract for read-heavy fan-out (max concurrency 4,
  parent responsibilities, task-assignment and ownership-manifest formats,
  a two-branch conflict policy, a one-spot-check-per-subagent verification
  step reusing Phase 8's own rubric vocabulary, failure/cancellation rules,
  final-synthesis requirements) plus a fully-specified but
  authorized-but-not-yet-exercised write-parallelism mode (max concurrency
  2, mandatory integration order, mandatory reconciliation review, a
  2-round correction limit). Its own representative task -- the four-way
  pipeline cross-reference this design cites throughout -- is the one
  concrete proof this contract works in practice, run once, read-only,
  synthesized into `phase-10-pipeline-cross-reference.md`. Write-
  parallelism itself has never been exercised in this repository, by
  design (D7 of that phase).
- **Five gate policies, a populated risk register, and the full lifecycle/
  contract stack** (`policies/gates/*.yaml`, `policies/risks/risk-register.yaml`,
  `handoff-contract.md`, `investigation-contract.md`, `review-contract.md`,
  `completion-contract.md`, `task-classification.md`, `lifecycle.md`,
  `risk-and-approval-policy.md`) -- unchanged by this segment, the
  authoritative source for the "final operating model" outline in section
  6 below rather than something this phase re-derives.

### 2.2 What specifically remains to close the acceptance criteria

Cross-referencing Phase 10's own six acceptance criteria against the state
above:

| Criterion | Status per this segment's findings | What remains |
| --------- | ------------------------------------ | ------------- |
| Full lifecycle used on real work | Partially -- Phase 8's one scenario (self-administered, disclosed limitation) and Phase 9's own representative task are both real uses of parts of the lifecycle, but neither exercised the full lifecycle (CLS through PRP) on an ordinary, non-meta piece of AgentQuilt product/repo work end to end | A pilot plan (section 3) proposing which real instances close this gap |
| Provider-specific workflows documented and maintainable | Substantively yes (both pipelines built and live) but the documents describing them are stale (three "Proposal" headers; Codex's D1/D6 content divergence) | A documentation-currency fix, proposed as one of the 8 pilot categories (section 3.5) |
| Default small/standard/high-risk workflows established | **Already done** -- `agent-portfolio.md` section 5.1, `task-classification.md`, `lifecycle.md` section 4 | Cross-reference only in the final operating model (section 6); no new design work |
| Obsolete agent definitions removed or archived | **Already done** -- 41 directories retired in Phase 3, confirmed still absent from the current 14-directory portfolio (section 8) | Confirmation only, stated explicitly in section 8 |
| No custom execution runtime | **Confirmed still true** -- no runtime/scheduler-named file exists anywhere in the repo; every provider mechanism named across all nine phases is a native primitive (section 8) | Confirmation only |
| AgentQuilt user-facing behavior independent of the pipeline | **Confirmed true** -- exactly one `packages/agentquilt-cli/src/` commit postdates the effort's start, and it is a retraction (removing dead, never-shipped Claude-API-integration code), not new pipeline-driven product functionality (section 8) | Confirmation only |

Three of six criteria are therefore already met by prior phases' own work
and need only be stated and verified here (section 8), not designed. The
other three -- full-lifecycle real use, current documentation, and (by
extension) the operating-model/maintenance documents themselves -- are this
segment's actual remaining design surface, addressed in sections 3-7 below.

## 3. Pilot plan -- the 8 required categories

Per the phase doc's own instruction and the task's standing constraint not
to force a synthetic exercise where a real one is unavailable, and not to
force execution of something genuinely risky without an explicit gate,
each category below is either (a) mapped to a specific, real, currently
available piece of this repository's own work, described in enough detail
to execute in segment 2, or (b) explicitly deferred to a Maintainer-paced
checklist, mirroring Phase 8's D2/D8 pattern, with the reasoning stated.

### 3.1 Low-risk bug

**Real instance available: none currently on record as a live, real bug.**
Unlike Phase 8's scenario 1 (a deliberately planted, synthetic bug in
`normalize.ts`), this repository has no disclosed, currently-open, real
low-risk bug in `packages/agentquilt-cli/` at the time of this design (the
one open-and-disclosed code-level issue on record, the Bash-guard hook's
command-chaining bypass noted in Phase 9's cross-reference section 4.1, is
a guardrail-hardening item, not a product bug, and is more naturally a
`fix-ci`/hardening task than a "bug fix" pilot instance -- see 3.7).

**Recommendation: defer to a Maintainer-paced checklist item** -- the next
genuine, real, low-risk bug report against `packages/agentquilt-cli/`
(filed as a GitHub issue per the existing issue-form templates,
`github-ci-integration.md`) becomes this pilot category's instance
whenever it naturally occurs, run through `develop-issue` (Claude Code) or
`standard-development` (Codex) end to end, scored the same way Phase 8's
own scenario 1 already was. This is not a synthetic exercise forced to
exist on schedule; it is the same "accumulate real runs as real
opportunities arise" pattern Phase 8's own D2/D8 already established for
its 6-per-provider acceptance bar. **Alternative considered**: reuse Phase
8's own scenario-1 scored run (self-administered, disclosed fidelity
limitation) as this pilot category's data point outright, since it is a
real, already-completed, already-scored run against this exact repository.
See D1 below -- this is the single most load-bearing open decision in this
whole plan, since it recurs across several categories.

### 3.2 Medium feature

**Real instance available, contingent on D9 below: the ESLint-configuration
follow-up named in D8 of `github-ci-integration.md`** (section 9 of that
document: "add ESLint configuration" as a candidate follow-up task, not yet
planned). This is genuinely medium-sized (choosing/authoring a rule set,
verifying it against 50+ existing files without introducing a wave of
unrelated fixes, wiring it into `test.yml` as a blocking step once clean)
-- larger than a bug fix, smaller than an architecture change, with a real,
disclosed, currently-open gap as its subject. It is real AgentQuilt
development-infrastructure work (CI tooling), not fabricated for this
pilot.

**Alternative if D9 declines this**: defer to the Maintainer's own next
real feature request against `packages/agentquilt-cli/` (a genuine product
feature, run through the same lifecycle), at whatever pace one next
becomes available -- mirroring 3.1's deferral reasoning. **Recommendation:
attempt the ESLint-configuration task as this category's real instance**,
since it is available now, real, and valuably closes a disclosed Phase 7
gap rather than leaving it open indefinitely (see D5 for the explicit
treatment of whether fixing known gaps belongs in this phase at all).

### 3.3 Refactor

**Real instance available: the two disclosed Phase 8 runbook follow-ups**,
treated as one bounded refactor-shaped documentation task:

1. `evals/runbook.md` step 7's discard-wording gap (scenario 01's results
   file, "Follow-up" item 1: the wording should explicitly require
   reverting uncommitted working-tree changes, not just deleting the
   scratch branch).
2. `evals/runbook.md` section 5's dimension-9 reviewer-delegation
   ambiguity (item 2: should an orchestrator-run scenario delegate to an
   independent reviewer for dimension 9 fidelity, or is self-review this
   mode's accepted ceiling).

Both are small, bounded, low-risk edits to an existing document's own
wording -- genuinely refactor-shaped (clarifying existing structure/wording
without changing the underlying mechanism) rather than net-new content,
and both are real, disclosed, currently-unresolved items already on this
repository's own record (`evals/results/summary.md`'s "Cross-scenario
findings" section), not invented for this pilot. **Recommendation: treat
as this category's real instance**, contingent on D5/D9 (whether Phase-10
touches Phase-8-owned follow-ups while Phase 8 itself is still
`awaiting_approval`).

### 3.4 Provider-output change

**No real, currently-needed provider-output (compiled-agent-content)
change is on record.** Scenario 5 of Phase 8's own scenario pack
(provider fixture change) is the closest existing exercise of this
category, but it is itself an unscored, unrun scenario, not a completed
pilot data point, and per the standing constraint against forcing a
synthetic exercise, this design does not propose planting an artificial
adapter change purely to exercise this category.

**Recommendation: defer entirely to a Maintainer-paced checklist item** --
run Phase 8's scenario 5 for real (its own already-designed synthetic-but-
real fixture change) as this category's pilot instance, at whatever point
the Maintainer works through the eval-pack backlog (which this design's
D1 explicitly proposes reusing rather than duplicating). This is the one
category where Phase 8's own existing scenario pack is the more
appropriate vehicle than inventing a separate Phase-10-native real
instance, since Phase 8 already built exactly this scenario and running it
serves both phases' evidence needs simultaneously.

### 3.5 Documentation task

**Real instance available, explicitly flagged by Phase 9's own
representative task: the three stale status headers plus the Codex D1/D6
content divergence.** Concretely, four bounded edits:

1. `claude-code-pipeline.md`'s header: "Proposal... Not yet built" ->
   "Built" (matching `agent-portfolio.md`'s and `github-ci-integration.md`'s
   own pattern), citing the committed skills/commands/settings.json as
   evidence.
2. `codex-pipeline.md`'s header: same correction, plus folding the
   `.codex/config.toml` D1 revision (the `sandbox_mode`-only mechanism,
   not the originally-proposed `[permissions.read-only-with-checks]`
   attachment) and the D6 override (Phase 6's `.codex/hooks.json` global
   hook, superseding D6's original "do not add one" recommendation) back
   into the document's own prose, and resolving D7's own still-open-looking
   text (whether the 6 specialists get built) to reflect that they are.
3. `guardrails-design.md`'s header: same "Proposal" -> "Built" correction.
4. `phase-08-report.md`'s frontmatter: add the missing third commit
   (`e5e68a3`) Phase 9's spot-check found absent from its `commits:` list.

This is the single most concrete, lowest-risk, highest-confidence pilot
instance available across all 8 categories -- already fully specified by
Phase 9's own investigation, requiring no new investigation of its own,
genuinely small-profile, and directly recommended by Phase 9's synthesis
itself. **Recommendation: execute this as the documentation-task pilot
instance**, contingent only on D9 (whether Phase 10 acts on a Phase-9
finding about Phase-8-adjacent content while Phase 8 remains
`awaiting_approval` -- addressed directly in D9, not a blocker to this
specific edit since none of the four edits touch anything Phase 8 itself
owns).

### 3.6 CI failure

**No live, currently-red CI check exists to diagnose** -- this repository's
CI is not failing right now (the D8 lint/format gap is `continue-on-error:
true`, informational, not a failing/blocking check; nothing else is red).
Phase 8's own scenario 8 (failing CI diagnosis) already specifies exactly
this category's exercise, including its own throwaway-scratch-branch
fixture recipe, deliberately built so as not to require inventing a new
one here.

**Recommendation: defer to a Maintainer-paced checklist item**, run as
Phase 8's scenario 8 for real, at whatever point CI is next actually red
on a real branch (the most realistic trigger for this category) or the
Maintainer chooses to run the scenario's own scratch-branch fixture
deliberately. This mirrors 3.4's reasoning: Phase 8 already owns the
correct vehicle for this category; Phase 10 does not need a second one.

### 3.7 Release preparation

**Real instance available: a live run of `release-readiness` (Claude Code)
or the `release-readiness` skill (Codex) against this repository's actual
current state**, read-only by the `release-reviewer` role's own contract,
producing a real Release-Readiness Summary scored against
`completion-contract.md` section 4's format -- functionally identical to
Phase 8's own scenario 10, but usable as a real pilot instance precisely
because it is read-only and therefore carries no execution risk: running
it produces zero file changes regardless of the verdict, and the verdict
itself is not acted on (no version bump, no tag, no publish, matching this
whole effort's standing "local only" constraint).

**Recommendation: execute this as the release-preparation pilot instance**,
explicitly labeled a read-only evaluation run, not a real release decision
-- the safest category to actually run now precisely because its own role
contract already forbids the read-write actions that would make execution
risky.

### 3.8 High-risk architecture or schema task

**No safe, currently-available real instance exists, and this design does
not propose constructing one.** Scenario 3 of Phase 8's own scenario pack
(schema compatibility change: a breaking manifest-field rename) is the
closest existing exercise, deliberately designed to test whether a run
recognizes an unflagged breaking change and stops at the gate -- but Phase
8's own scenario spec is explicit that "a run is scored successful... even
if it never proceeds past the gate," i.e. this scenario is itself designed
to test the STOP, not to actually execute a real schema change.

**Recommendation: defer this category entirely, as an explicit, gated,
Maintainer-paced item, never attempted inside a phase-executor segment.**
Reasoning, mirroring D7 of Phase 9's own coordination-contract design (the
decision to defer write-parallelism's first live trial rather than force
one under phase-executor time pressure): a genuine high-risk architecture
or schema change carries real persisted-format and public-interface risk
(`risk-and-approval-policy.md` section 3); this effort's own standing
discipline (local-only, no destructive operations, no unauthorized
persisted-format changes) argues against manufacturing one purely to
satisfy a pilot-category checkbox. If the Maintainer has a genuine,
independently-motivated high-risk change in mind at the time this design
is approved, it can be named explicitly and slotted in as this category's
real instance (via a lettered decision at that time); absent that,
**Phase 10 does not attempt this category**, and its own D8 gate (already
specified in `risk-and-approval-policy.md` section 3, requiring
investigation, alternatives, and an ADR decision before any high-risk
architecture/schema task proceeds) remains the standing mechanism whenever
one does arise, unchanged by this phase. Running Phase 8's own scenario 3
(the gate-stop test, not a real change) as a substitute proof-of-mechanics
exercise is a defensible partial substitute, itself Maintainer-paced per
Phase 8's own runbook, not a Phase 10 executor action.

### 3.9 Summary table

| Category | Disposition | Real instance / vehicle |
| -------- | ----------- | ------------------------ |
| Low-risk bug | Deferred, Maintainer-paced | Next real GitHub issue against `packages/agentquilt-cli/` |
| Medium feature | Execute in segment 2 (pending D9) | ESLint-configuration follow-up (D8 of `github-ci-integration.md`) |
| Refactor | Execute in segment 2 (pending D5/D9) | Two disclosed `evals/runbook.md` wording gaps |
| Provider-output change | Deferred to Phase 8's own scenario 5 | Maintainer-paced, via `evals/runbook.md` |
| Documentation task | Execute in segment 2 | Three stale headers + Codex D1/D6 content fold-back + `phase-08-report.md` frontmatter |
| CI failure | Deferred to Phase 8's own scenario 8 | Maintainer-paced, via `evals/runbook.md` |
| Release preparation | Execute in segment 2 | Live, read-only `release-readiness` run against real current state |
| High-risk architecture/schema | Deferred indefinitely, explicit gate required | No instance proposed; standing `risk-and-approval-policy.md` mechanism applies whenever one arises |

Net: 3 of 8 categories have a concrete, real, immediately-executable
instance this design recommends running in segment 2 (documentation task,
release preparation, and -- pending D9 -- medium feature and refactor,
which would make it 4 of 8 if D9 resolves toward "yes, touch Phase-8/
Phase-9-adjacent gaps now"); 3 are deferred to Phase 8's own existing
scenario vehicle at the Maintainer's own pace; 1 (low-risk bug) is deferred
to natural occurrence; 1 (high-risk architecture/schema) is deferred
indefinitely pending explicit Maintainer initiation. This is a
partial-completion pilot bar by design, addressed directly in D4.

## 4. Metrics plan -- capturing the 11 required metrics without a telemetry service

Reusing Phase 8's rubric/results-file vocabulary throughout, per the task's
own instruction, rather than inventing a third measurement system:

| # | Metric | Source (no telemetry service) |
| - | ------ | ------------------------------ |
| 1 | Task completion rate | Count of pilot instances (section 3) that reach their own stated completion criteria versus the total attempted, read directly from each instance's PR Summary / Release-Readiness Summary and this phase's own report `checks_run` list -- the same "did it finish" fact Phase 8's results-file `Outcome: finished / gate / off-rails` field already captures per scenario. |
| 2 | First-pass test success | Whether the required tests (per each pilot instance's own scope) passed on the first attempt without a correction round -- directly observable from the session transcript and `git log` (a single implementation commit with no immediately-following "fix" commit is first-pass success), matching rubric dimension 8's own definition (`evals/rubric.md`). |
| 3 | Number of human corrections | A count, per pilot instance, of how many times the Maintainer had to redirect, correct, or reject an agent's proposed action -- recorded narratively in that instance's results file (reusing `evals/results/TEMPLATE.md`'s structure), not computed automatically. |
| 4 | Valid review findings | Count of `review-tree` / `architecture-reviewer` findings that were genuine (led to a real fix or a documented accepted risk) versus noise, per pilot instance -- read directly from the Review Findings artifact each instance already produces (`review-contract.md` section 5.2's severity ladder), the same artifact rubric dimension 9 already scores. |
| 5 | False-positive review findings | The complement of #4 -- findings raised that, on investigation, were not real issues -- also read from the same Review Findings artifact, recorded explicitly rather than silently dropped (mirroring `controlled-multi-agent-parallelism.md` section 5.6's "documented-disagreement default, not a silent-pick default"). |
| 6 | Scope-creep incidents | Count of instances where a pilot run touched a file outside its own stated allowed-file set (per that instance's own Implementation Handoff), read directly via `git diff --stat` against the handoff's own scope -- the same PASS/FAIL check rubric dimension 4 ("scope control") already defines. |
| 7 | Generated-file mistakes | Count of any attempted or completed hand-edit to `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`, or `agentquilt.lock` across all pilot instances -- rubric dimension 6's own PASS/FAIL check, read from `git diff` and, where a guardrail fired, the hook's own log output. |
| 8 | Missed documentation changes | Count of instances where a `documentation-reviewer` finding (or the absence of one where a doc update was actually needed, caught later) reveals a doc-impact miss -- read from each instance's Review Findings artifact plus a post-hoc check against `documentation-reviewer`'s own fragment-currency duty, matching rubric dimension 11. |
| 9 | Approval-boundary violations | Count of any instance where an agent proceeded past a gate trigger (`execution-model.md` section 7 / `risk-and-approval-policy.md` section 3) without a recorded Maintainer decision -- rubric dimension 12's own PASS/FAIL check, the single most safety-critical metric, read directly from whether a decision record exists before the corresponding action's commit. |
| 10 | Cycle time | Wall-clock or turn-count duration per pilot instance, start (task handed to the provider) to finish (PR Summary or gate stop) -- recorded as a coarse observed number per instance's results file, mirroring rubric dimension 14's own "Observed / Not observed / N-A" treatment (raw numbers noted, never normalized into a synthetic score or compared across providers as if controlled). |
| 11 | Provider-specific strengths and weaknesses | A qualitative synthesis across all pilot instances that used both providers (where D2/D9 make that possible), written narratively in this phase's own final report and, if instances run through Phase 8's `evals/` vehicle, cross-referenced against `evals/results/summary.md`'s own per-provider rows -- not a scored metric on its own, a synthesis of the other 10. |

**Storage**: each pilot instance that executes in segment 2 gets one results
file, `evals/results/<provider>/pilot-<slug>-<date>.md` if it maps to an
existing Phase 8 scenario number, or a new, parallel
`.docs/agentic-sdlc/pilot-results/<slug>-<date>.md` file (using the exact
same TEMPLATE.md structure) for the 4 pilot instances that do not map to
any of Phase 8's 12 scenarios (the documentation-task fix, and the two
deferred-to-Phase-8-vehicle categories excepted). See D6 for the explicit
choice between reusing `evals/results/` directly versus a parallel
directory.

**No script parses, aggregates, or scores anything.** Every metric above is
a human (the Maintainer, or the executing agent under the Maintainer's
direction) reading a real artifact this repository's contracts already
produce and writing a rating or a count into a Markdown file -- identical
in kind to Phase 8's own D5 "hand-maintained, no auto-regeneration" choice
for `evals/results/summary.md`, extended to this phase's own pilot
instances rather than duplicated as a second summary mechanism.

## 5. Tuning plan -- what evidence already supports, and what needs pilot data first

Cross-referencing the phase doc's ten possible tuning actions against what
Phases 4-9 have already revealed, distinguishing plausible-now from
needs-more-data:

| Tuning action | Plausible now, with evidence | Needs pilot data first |
| -------------- | ------------------------------ | ------------------------ |
| Shorten overly verbose agents | No specific finding yet -- none of Phases 3-9's own investigations flagged a specific agent definition as too long; `.claude/agents/*.md` / `.codex/agents/*.toml` files have not been read end-to-end for length in this design's own research | Needs a direct length/verbosity pass over the 14 compiled agent definitions on both providers, deferred to segment 2 or a dedicated follow-up, since this design's own scope did not include reading all 28 (14 x 2 providers) files in full |
| Merge redundant agents | Already done, structurally -- Phase 3's 46-to-14 rationalization is the merge-redundant-agents action this phase doc anticipates; no further merge candidate has been identified in Phases 4-9's own findings | No further evidence exists yet that any of the current 14 are still redundant with each other; would need pilot-run evidence of two roles doing overlapping work in practice |
| Improve triggering descriptions | Plausible now, narrowly: Phase 9's cross-reference (section 4.2) notes Codex naming diverges from Claude Code by design (`repository-explorer` not `repository-analyst`, `test-reviewer` not `test-engineer`) -- if a pilot instance surfaces confusion from this divergence, tightening the two providers' triggering language to cross-reference each other explicitly is a concrete, low-cost fix | Whether this divergence actually causes triggering confusion in practice is unconfirmed -- needs at least one real cross-provider pilot run to observe |
| Tighten write permissions | No specific finding yet requiring this -- Phase 9's cross-reference (section 4.1) flags the Bash-guard hook's disclosed command-chaining bypass (`&&`/`;` smuggling) as a real, live gap, which is a hook-strengthening candidate (see below), not itself evidence that any agent's write permissions are currently too loose | Needs a specific pilot instance where over-broad write permission caused or nearly caused a scope-creep incident (metric 6) before tightening a specific role's scope |
| Improve specialist routing | No specific finding yet -- `agent-portfolio.md` section 5.2's routing table has not been exercised against enough real pilot instances yet to know if any specialist under- or over-triggers | Directly needs pilot data: metrics 4/5 (valid vs. false-positive review findings) accumulated across several real pilot instances is exactly the evidence this tuning action requires |
| Adjust workflow complexity by risk | Already largely done -- `agent-portfolio.md` section 5.1 and `risk-and-approval-policy.md` section 4 already scale plan-approval and stage sequence by profile; no Phase 4-9 finding argues a specific profile's complexity is currently miscalibrated | Would need pilot evidence that a specific profile (most likely "standard," the widest band) is consistently over- or under-weighted before recommending a specific adjustment |
| Remove hooks that create noise | No hook has been flagged as noisy in any Phase 4-9 finding -- the two hooks built (Claude Code's per-agent Bash guard, Codex's global `PreToolUse` guard) are both narrowly scoped denies, not broad warnings, and Phase 9's cross-reference explicitly confirms the Claude Code hook fired correctly (not spuriously) mid-investigation | No noise has been observed yet because these hooks have barely been exercised outside that one confirmed-correct firing; needs several more pilot runs before "noisy" could even be assessed |
| Strengthen hooks that catch real mistakes | **Directly plausible now, with concrete evidence**: Phase 9's cross-reference (section 4.1) discloses the Bash-guard hook's own self-acknowledged command-chaining bypass (`pretooluse-guard.sh:73-76`, "a caller could still chain commands with `&&` or `;` to smuggle a denied command after an allowed prefix") -- this is a real, already-identified, already-cited gap in an already-built, already-firing guardrail, the single clearest strengthen-a-hook candidate this design found. Also plausible: the Phase-6-deferred `Stop`-hook fallback for skipped-validation detection (Phase 9 cross-reference 4.1, "explicitly deferred, unbuilt guardrail") | Whether the command-chaining bypass has ever actually been exploited (accidentally or adversarially) in a real run is unconfirmed -- the fix itself (parsing/blocking `&&`/`;` chains) does not strictly need pilot data to design, but confirming its priority against other tuning candidates benefits from at least one more real run |
| Improve completion criteria | No specific finding yet -- `completion-contract.md`'s PR Summary and Release-Readiness Summary formats have not been reported as inadequate by any real run except Phase 8's own scenario 01, which rated the format GOOD, not inadequate | Needs several more real pilot instances before a completion-criteria gap (if any) would be visible; the one existing data point does not show one |
| Update evaluation scenarios | **Directly plausible now, with concrete evidence**: `evals/results/summary.md`'s own "Cross-scenario findings" section already names two specific runbook wording gaps (the discard-step revert wording; the dimension-9 delegation ambiguity) disclosed by the one existing scored run -- both are section 3.3's proposed refactor pilot instance, which doubles as this tuning action's own execution | None -- this is the one tuning action this design recommends executing now, as part of the pilot itself (section 3.3), not deferred |

**Net recommendation**: of the ten possible tuning actions, two have
concrete, already-disclosed evidence supporting action now (strengthen the
Bash-guard hook's command-chaining gap; update the two eval-scenario
runbook wording gaps -- the latter folded into section 3.3's refactor pilot
instance already). One is already effectively done by Phase 3 (merge
redundant agents). The remaining seven genuinely need pilot-run evidence
this design has not yet collected, and this segment does not propose
guessing at them ahead of that evidence -- consistent with the phase doc's
own framing ("Based on evidence"), not a checklist to fill in regardless of
whether evidence exists.

## 6. Final operating model -- outline and source-mapping

Per the phase doc's 11 required topics, mapped against what already has a
clear existing answer in this repository's docs versus what needs genuinely
new decision-making now:

| # | Topic | Existing answer, or new? |
| - | ------ | -------------------------- |
| 1 | How to start each workflow | **Existing, assemble from**: `github-provider-handoff.md` (the "I have an issue/PR number" mechanics for both providers) + each pipeline doc's own skill/command or skill/custom-agent invocation list. No new design needed, only synthesis. |
| 2 | Which workflow profile to choose | **Existing**: `task-classification.md` (small/standard/high-risk triggers) + `agent-portfolio.md` section 5.1 (per-profile stage sequence). No new design needed. |
| 3 | When to use Claude Code | **Partially new**: no existing document states an explicit Claude-Code-vs-Codex decision rule; both pipeline docs describe their own mechanics but neither compares against the other for "which one, when." This is genuinely new synthesis this document must write, informed by Phase 9's cross-reference (section 4.1-4.2's per-provider strengths: Claude Code's richer per-agent Bash scoping and `Agent(isolation)` worktree primitive versus Codex's `codex exec` native batch-concurrency path and prompt-recognized depth-1 delegation). |
| 4 | When to use Codex | Same as above -- new synthesis, same evidence base. |
| 5 | When to use multiple agents | **Existing, cross-reference directly**: `controlled-multi-agent-parallelism.md` is a complete, approved, already-exercised-once coordination contract -- the final operating model document should reference it by name and summarize its own section 4/5.1 concurrency rule and section 2.2 "what benefits from fan-out" survey, not re-design it. |
| 6 | When human-led development is required | **Existing**: `risk-and-approval-policy.md` sections 2-3 (absolute rules; approval gate triggers) already state this precisely. No new design needed. |
| 7 | How to update agents and skills | **Partially new**: `agent-portfolio.md` section 9's own segment-2 build procedure (source-fragment edit, `npx agentquilt build`, `npx agentquilt check`) is the mechanical answer for Claude Code agent definitions specifically; no existing document states the equivalent procedure for Codex's `.codex/agents/*.toml` files (which are not compiler-managed the same way) or for either provider's skills. This document must state both explicitly. |
| 8 | How to review provider configuration changes | **Partially new**: `guardrails-design.md` documents what the guardrails are, not a review procedure for changing them. This document should state: a `.claude/settings.json` or `.codex/config.toml`/`.codex/hooks.json` change is itself a high-risk-adjacent change (it affects every future agent's permission boundary) and should go through `architecture-reviewer` plus a direct empirical test (attempt the exact denied action on a scratch branch, confirm it is still blocked) before being trusted, mirroring `guardrails-design.md`'s own segment-2 acceptance-test pattern. New synthesis, grounded in an existing precedent. |
| 9 | How to validate hooks after provider upgrades | **New**: no existing document addresses this at all -- every phase's own hook validation (Phase 6's acceptance tests, Phase 9's confirmed-firing observation) was a one-time build-time check, not a recurring revalidation procedure. This document must propose one (see section 7's maintenance-document overlap: "provider-version compatibility checks" is the natural home for the trigger, this topic is the natural home for the procedure itself). |
| 10 | How to retire obsolete agents | **Existing procedure, no current subject**: `agent-portfolio.md` section 9's own segment-2 build procedure (for the 41-directory Phase 3 retirement) is the direct template -- delete the `.agentquilt/agents/<name>/` directory and its compiled `.claude/agents/<name>.md` / `.codex/agents/<name>.toml` outputs together, `git rm` both together (not remove-then-rebuild, since `agentquilt build`/`check` do not prune orphaned outputs on their own, per that section's own finding), rebuild, verify `npx agentquilt check` exits 0. This document restates the procedure generically (it is not agent-specific); no new agents are currently obsolete (section 8 confirms), so this is a template for future use, not an action item now. |
| 11 | How to introduce another provider without adding a runtime | **New**: no existing document addresses a third provider at all. This document must state the pattern implicit across Phases 4-5-6's own choices (a new `<provider>-pipeline.md` design following the same shape as `claude-code-pipeline.md`/`codex-pipeline.md`; provider-native primitives only, no custom runtime; the same 14-role portfolio reused, not duplicated; the same lifecycle contracts (`investigation-contract.md` etc.) reused unchanged, since they are already provider-neutral by construction) as an explicit, generalized recipe. |

**Net**: 5 of 11 topics (1, 2, 5, 6, 10) are pure cross-reference/synthesis
of already-decided material -- no new design-level decision-making
required, only assembly. The other 6 (3, 4, 7, 8, 9, 11) require this
document to write genuinely new operating guidance, informed by, but not
already stated in, the existing pipeline/portfolio/guardrails documents --
this is the real remaining design work for segment 2 (or a dedicated
follow-up), not something this segment 1 attempts to pre-write in full,
since several of these topics (3, 4 especially) benefit directly from
pilot evidence this design has not yet collected (D3).

## 7. Maintenance document -- outline with concrete proposed answers

Per the phase doc's 7 required topics, proposed concretely rather than left
as a skeleton, grounded in this repository's actual single-maintainer
reality (`risk-and-approval-policy.md` section 5's own "single-maintainer
reality" framing, reused rather than re-derived):

1. **Owners.** The Maintainer (currently the sole human in this
   repository's governance model, per `risk-and-approval-policy.md`
   section 5 and ADR-0004's authority model) owns every agent/skill source
   file, every provider configuration file, and every gate policy. No
   distributed ownership model is proposed (there is exactly one human
   role in this repository's current governance), but the maintenance
   document should name this as the current state, explicitly revisitable
   the day a second maintainer joins.
2. **Review cadence.** Proposed: no fixed calendar cadence (for example
   "monthly") is imposed, since this repository's own development pace is
   irregular and a fixed calendar cadence would either sit idle (nothing
   changed) or lag behind a burst of real activity. Instead: a review is
   triggered by events (section 6, this document's own listed triggers:
   a provider CLI upgrade, a pilot instance surfacing a tuning candidate,
   a new phase or significant real-work milestone). This mirrors this
   effort's own actual history -- nine phases triggered by deliberate
   Maintainer initiation, not a calendar.
3. **Provider-version compatibility checks.** Proposed: whenever the
   Maintainer upgrades Claude Code or Codex CLI versions, run (a) one
   guardrail empirical test per provider (attempt a known-denied action --
   a generated-file edit, an absolute-rule command -- on a scratch branch,
   confirm it is still blocked, per `guardrails-design.md`'s own
   acceptance-test pattern) and (b) a custom-agent/skill discovery check
   (Codex: `codex exec "list the custom agents available to you in this
   project"`, per `codex-pipeline.md`'s own already-specified verification
   step; Claude Code: confirm `.claude/agents/*.md` files are still
   recognized via a plain interactive-session check). Both are cheap,
   provider-native, no new tooling.
4. **Prompt and agent review policy.** Proposed: any edit to an
   `.agentquilt/agents/<name>/` source fragment (not the compiled output)
   goes through `documentation-reviewer` at minimum (fragment-currency,
   consistency with the role's own contract in `agent-portfolio.md`
   section 6) and, for a core-role or specialist-trigger change
   specifically (not a wording polish), `architecture-reviewer` as well,
   mirroring how any other source change in this repository is reviewed --
   an agent definition is source code for this repository's own
   development process and gets the same review discipline as any other
   source file, not a lighter one.
5. **Benchmark rerun cadence.** Proposed: tied to Phase 8's own eval pack,
   not a separate schedule -- rerun a scenario when (a) the pipeline it
   exercises changes materially (a new skill, a changed guardrail, a
   portfolio role change) or (b) enough real calendar time has passed that
   the one existing scored run's self-administration fidelity limitation
   (disclosed in `evals/results/claude-code/01-isolated-bug-fix-2026-07.md`)
   is worth re-testing blind. No fixed number of weeks/months is proposed,
   consistent with topic 2's event-triggered reasoning.
6. **Documentation update triggers.** Proposed, directly informed by this
   segment's own section 3.5 finding: a design document's status header
   must be corrected the moment its own segment-2 build lands (the
   "Proposal... Not yet built" -> "Built" pattern `agent-portfolio.md` and
   `github-ci-integration.md` already follow correctly, and
   `claude-code-pipeline.md`/`codex-pipeline.md`/`guardrails-design.md`
   currently do not) -- proposed as a checklist item on every future
   phase's own segment-2 completion step, not a new standalone process.
   Separately: any decision recorded as "D<n>" in a design document that
   is later revised or overridden by a subsequent phase (as happened to
   Codex's D1 and D6) must have that revision folded back into the
   original document's own text, not left as a comment buried in a
   generated config file's header, per this segment's own section 3.5
   pilot instance.
7. **Rollback procedure.** Proposed: since every artifact this effort
   produces is either (a) a plain-text design/contract document, (b) a
   compiler-managed agent source plus its generated output, or (c) a
   provider configuration file (`.claude/settings.json`,
   `.codex/config.toml`, `.codex/hooks.json`) -- all of it is ordinary
   Git-tracked content with no runtime state, no database, and no external
   side effect. Rollback is therefore always `git revert` of the specific
   commit(s) that introduced a problem, followed by (for a compiler-source
   change) `npx agentquilt build` to regenerate the now-reverted output and
   `npx agentquilt check` to confirm zero drift -- no special rollback
   tooling is needed or proposed, consistent with this whole effort's "no
   custom runtime" constraint.
8. **Criteria for graduating experimental workflows.** Proposed,
   mirroring Phase 9's own D7 reasoning (write-parallelism is
   "authorized-but-not-yet-exercised," not yet "routine"): a workflow (or
   a coordination-contract mode) graduates from experimental to routine
   default status when it has (a) at least 2-3 real, successful pilot or
   real-development uses with no unresolved BLOCKER/HIGH finding, (b) no
   open correction-limit exhaustion (`execution-model.md` section 9's own
   2-round limit, or `controlled-multi-agent-parallelism.md` section 6.5's
   write-parallel equivalent) in any of those uses, and (c) an explicit
   Maintainer decision recorded the same way every other phase decision in
   this effort has been recorded (a lettered D-decision in the relevant
   design document, updated to reflect the graduation). Concretely, this
   means write-parallelism (Phase 9) remains experimental until this
   criteria set is met by real trials, not by this document's own say-so.

## 8. Acceptance-criteria treatment

Direct verification of the three criteria this segment can settle now
without executing any pilot work, per the task's own explicit request:

### 8.1 "Obsolete agent definitions are removed or archived"

**Already satisfied, confirmed directly this segment.**
`agent-portfolio.md` section 9.3 lists 41 explicitly named retired
directories (`adr-writer`, `agent-behavior-reviewer`, ... `versioning`,
full list at that section). Direct filesystem check this segment:
`ls -d .agentquilt/agents/*/` (excluding `project/`) returns exactly 14
directories; `ls .claude/agents/*.md` returns exactly 14 files. None of
the 41 retired names appear in either listing. Per that section's own
recoverability statement, all retired content remains available via git
history (commit `acb27fc` for the pre-restructure layout), satisfying
"archived" even in the stronger sense of "recoverable," not merely
"deleted." No further action needed; this criterion closes as already
met, dated to Phase 3 (2026-07-12), not newly satisfied by this phase.

### 8.2 "There is no custom execution runtime"

**Confirmed still true, verified directly this segment.**
`find . -maxdepth 3 -iname '*runtime*' -o -iname '*scheduler*'` (excluding
`node_modules`/`.git`) returns zero results. `grep -rl "custom runtime\|
custom scheduler\|custom runner" .docs/agentic-sdlc/` returns zero
matches. Every mechanism named across all nine phases' own designs is a
native provider primitive: Claude Code's `Agent` tool (with `isolation`,
`run_in_background`), `SendMessage`, `TaskStop`, `EnterWorktree`/
`ExitWorktree`, hooks via `.claude/settings.json`; Codex's prompt-
recognized custom-agent delegation, `codex exec`, `.codex/hooks.json`
`PreToolUse` hooks, `sandbox_mode`/`default_permissions`. No phase
introduced a script, service, wrapper, or scheduling layer of its own --
`controlled-multi-agent-parallelism.md` section 3.3 makes this
confirmation explicit for Phase 9 specifically, and this segment's own
direct filesystem/grep checks corroborate it holds across the whole
effort, not just that one phase.

### 8.3 "AgentQuilt user-facing behavior remains independent of the development pipeline"

**Confirmed true, verified directly this segment via git log.**
`git log --oneline --all -- packages/agentquilt-cli/src/` returns 12
commits total; the effort's own earliest commit is `922995d`
(2026-07-11, Phase 0's start, confirmed against `phase-00-report.md`'s
`started: 2026-07-11`). Exactly two `src/` commits postdate that start:
(a) `8a50af2` (2026-07-11, same day) -- a repository-structure/agent-
source-layout refactor (moving compiled agent sources under
`.agentquilt/agents/`) unrelated to the agentic-sdlc pipeline's own
content; (b) `2e57fb4` (2026-07-12) -- Phase 1's own approved, gated
deletion (R1-R3, `phase-01-report.md` lines 286-292) of dead,
never-shipped Claude-API-integration code (`src/integration/claude-agent.ts`,
its test file, the `@anthropic-ai/sdk` devDependency), explicitly recorded
as removing code with "no importers... absent from dist," i.e. a commit
that reduces product surface area by deleting unused code, not one that
adds pipeline-driven product functionality. Neither commit adds a new
CLI command, flag, output format, or exit code on the pipeline's behalf.
This criterion is satisfied: no Phase 2-10 deliverable has ever changed
what `agentquilt build`/`check`/`init`/`agents add`/`skills add` do for an
end user.

## 9. Decision points for the Maintainer (gate)

- **D1 -- Does Phase 10 reuse Phase 8's scenario-1 scored run as one pilot
  data point, or does every one of the 8 categories require an entirely
  fresh real-work instance?** Recommendation: **reuse it, explicitly
  relabeled with a different lens.** Phase 8's scenario 1 (isolated bug
  fix, Claude Code, self-administered, scored 2026-07) is a real, already-
  completed run against this exact repository's real `normalize.ts`
  function -- it is not synthetic in the sense of being fictional, only in
  the sense of having a deliberately planted (not organically discovered)
  bug. Phase 10's own lens ("did the process work in practice," not "does
  it score well against a synthetic scenario") can be applied to that same
  run's own already-recorded evidence retroactively: it demonstrates a
  real end-to-end small-profile lifecycle traversal (investigation, fix,
  focused-then-full test run, drift check, PR Summary), with its self-
  administration limitation already disclosed rather than hidden. Counting
  it as this pilot's "low-risk bug" category data point, with the explicit
  caveat that a second, genuinely blind real-bug instance (section 3.1's
  Maintainer-paced deferral) should still be sought before treating the
  category as fully closed, gets more signal from already-spent effort
  without re-running an equivalent exercise from scratch. **Alternative**:
  require Phase 10's own fresh instance for every category, treating Phase
  8's run as Phase 8's evidence only -- more rigorous separation between
  the two phases' own evidence bases, not recommended primarily because it
  discards a real, valid, already-scored data point for no concrete
  benefit, and because the two phases' own stated purposes (Phase 8:
  pipeline-quality scoring; Phase 10: does the process work on real work)
  are compatible enough that the same run legitimately serves both without
  double-counting, provided (as recommended) the relabeling is explicit
  and the self-administration caveat travels with it.
- **D2 -- For each pilot category with no obviously-available real
  instance (low-risk bug, provider-output change, CI failure), defer to a
  Maintainer-paced checklist (Phase 8's D2/D8 pattern) or construct a
  specific real-but-constructed instance?** Recommendation: **defer**, as
  proposed in sections 3.1, 3.4, 3.6 above -- each of these three
  categories already has a purpose-built, real (if deliberately fixture-
  planted) vehicle in Phase 8's own scenario pack (scenarios 8, 5, and the
  general "next real bug" pattern respectively), and constructing a second,
  Phase-10-native vehicle for the same category would duplicate Phase 8's
  own apparatus rather than reuse it, directly contradicting the task's
  own instruction to reuse Phase 8's vocabulary "rather than inventing a
  third measurement system." **Alternative**: construct one small,
  genuinely real Phase-10-specific instance per category regardless (for
  example, deliberately breaking one test on a scratch branch for the CI-
  failure category, mirroring Phase 8's own scenario 8 fixture almost
  exactly) -- redundant with Phase 8's own already-built fixture, not
  recommended.
- **D3 -- Should the high-risk architecture/schema pilot category be
  attempted at all inside this phase, or explicitly deferred as a live
  gate-triggering exercise the Maintainer schedules separately?**
  Recommendation: **defer entirely**, as proposed in section 3.8, with no
  substitute construction attempted inside a phase-executor segment.
  This mirrors Phase 9's own D7 precedent almost exactly (defer a
  genuinely higher-risk first exercise to a deliberately later, calmly-
  scoped moment rather than force it under this phase's own completion
  pressure) and this effort's standing local-only, no-destructive-
  operation discipline. **Alternative**: run Phase 8's own scenario 3 (the
  gate-STOP test, not an executed change) as a partial substitute inside
  this phase -- defensible, since scenario 3 by its own design is scored
  successful even without ever proceeding past the gate, meaning it
  carries none of a real high-risk change's actual execution risk; could
  be adopted as a lightweight addition to D3's "defer" answer rather than
  a full alternative, at the Maintainer's discretion, since it does not
  conflict with the "defer real execution" recommendation.
- **D4 -- What does "Phase 10 complete" mean given the pilot is likely
  partially Maintainer-paced?** Recommendation: mirroring Phase 8's own
  D8 pattern (a partial-completion bar plus an accepted handoff checklist,
  not literal completion of all 8 categories x 2 providers), **Phase 10
  reaches `complete` when**: (a) this design document and, following
  Maintainer approval, the final operating-model and maintenance documents
  (sections 6-7) are built and committed; (b) the pilot instances this
  design recommends executing now (documentation task; release
  preparation; medium feature and refactor, pending D9) have actually run
  and been scored per section 4's metrics plan, demonstrating the full
  lifecycle has been used on real work at least once, end to end; (c) the
  two tuning actions section 5 identifies as evidence-supported now
  (strengthen the Bash-guard hook; the eval-runbook wording fixes, folded
  into the refactor pilot instance) are applied; and (d) the Maintainer
  explicitly accepts a named, dated handoff checklist (in
  `evals/results/summary.md` or a Phase-10-specific equivalent, per D6)
  for the deferred categories (low-risk bug, provider-output change, CI
  failure, high-risk architecture/schema) to be worked through at the
  Maintainer's own pace, outside any further phase-executor segment.
  **Alternative**: Phase 10 never reaches `complete` until literally all 8
  categories have run on both providers -- more literal to the phase doc's
  acceptance-criteria wording, not recommended for the same reason Phase
  8's own D8 rejected the equivalent alternative: this effort has no
  mechanism for a phase to sit in multi-week limbo, and several deferred
  categories (most importantly the high-risk one, per D3) should not be
  rushed just to close this phase's own bookkeeping.
- **D5 -- Does Phase 10 fix any of the already-known gaps (stale doc
  headers, D8 lint config, D7 branch protection) as part of its own pilot
  execution, or continue deferring them as separate Maintainer follow-ups
  untouched by this effort?** Recommendation: **fix the documentation-
  currency gap (the three stale headers, the Codex D1/D6 content fold-
  back, the `phase-08-report.md` frontmatter) now, as this phase's own
  documentation-task pilot instance (section 3.5)** -- this is
  simultaneously real, valuable, low-risk work and the single most
  directly-evidenced pilot instance available, recommended explicitly by
  Phase 9's own synthesis. **Treat the ESLint-configuration follow-up
  (D8) as this phase's medium-feature pilot instance, contingent on D9**,
  since it is real, disclosed, and available, though larger and slightly
  more judgment-laden (choosing a rule set) than the documentation fix.
  **Continue deferring branch protection (D7 of `github-ci-integration.md`)
  entirely** -- it requires a `gh api` / GitHub Settings action outside
  this effort's own local-only, no-push discipline (repository-wide
  settings changes are explicitly named as Maintainer-only follow-ups in
  that document's own D7 text), not something a pilot instance should
  attempt regardless of category mapping. **Alternative**: defer all three
  gaps untouched, treating Phase 10 as pilot-and-document only, never
  fix-anything -- more conservative, defensible, but would leave the
  single most concrete and already-recommended pilot opportunity (the
  documentation fix) unused in favor of a less-available alternative,
  which is not a stronger position.
- **D6 -- Where do Phase 10's own pilot results live: inside
  `evals/results/` (reusing Phase 8's directory and TEMPLATE.md directly)
  or a new, parallel `.docs/agentic-sdlc/pilot-results/` directory?**
  Recommendation: **reuse `evals/results/<provider>/` directly for any
  pilot instance that maps onto an existing Phase 8 scenario number**
  (release preparation -> scenario 10's own results path), and **use a new
  `.docs/agentic-sdlc/pilot-results/<slug>-<date>.md` directory, same
  TEMPLATE.md structure, for pilot instances with no Phase 8 scenario
  equivalent** (the documentation-task fix, the medium-feature/refactor
  instances) -- since these are not evaluation-scenario runs in Phase 8's
  own sense (no planted fixture, no synthetic framing), filing them under
  `evals/` would blur that directory's own stated scope
  ("evals/README.md: this directory holds the static evaluation apparatus
  for scoring the agentic development process... against real provider
  CLI runs" -- a fair description of Phase 8's scenarios, a less exact
  description of Phase 10's own real, organically-scoped work). Reusing
  the same TEMPLATE.md format (not inventing a fourth artifact shape)
  keeps the metrics comparable either way. **Alternative**: file
  everything under `evals/results/`, treating Phase 10's pilot instances
  as additional scenario runs regardless of scenario-number mapping --
  simpler (one directory, one summary table), not recommended because it
  would require either forcing a Phase-10-only instance to pretend it maps
  to one of Phase 8's 12 numbered scenarios (it does not, cleanly) or
  extending Phase 8's own numbered-scenario scope after the fact, which is
  a change to Phase 8's own artifact, not Phase 10's to make unilaterally.
- **D7 -- Does the final operating-model document (section 6) get written
  in the same segment as the pilot execution, or as its own later
  segment once pilot evidence exists?** Recommendation: **write it in a
  later segment, after the pilot instances section 3 recommends now have
  actually run**, specifically because topics 3 and 4 of section 6 ("when
  to use Claude Code" / "when to use Codex") are explicitly flagged as
  needing genuinely new synthesis informed by evidence this design has not
  yet collected (Phase 9's cross-reference gives some signal, but a real
  pilot run on both providers for the same category would sharpen it
  considerably) -- writing the full operating-model document before that
  evidence exists risks the same "guess ahead of evidence" problem section
  5's tuning plan explicitly declined to do for 7 of 10 tuning actions.
  **Alternative**: write the full document now, from the existing pipeline
  docs and Phase 9's cross-reference alone, treating any pilot-driven
  refinement as a later edit -- faster to a complete deliverable, not
  recommended because it risks the document reading authoritative before
  it has actually been informed by real dual-provider evidence, which is
  precisely the "final operating model" document's whole point to get
  right the first time it is written, not patch repeatedly.
- **D8 -- Does the maintenance document (section 7) get written now
  (segment 1's own proposed answers in section 7 are already fairly
  concrete) or held for the same later segment as D7?** Recommendation:
  **write it now, in segment 2, independent of D7's pilot-evidence
  question** -- unlike the operating-model document, none of the 8
  maintenance topics in section 7 depend on pilot-run evidence this design
  lacks; they depend on this repository's own governance model
  (single-maintainer, event-triggered review, Git-native rollback), which
  is already fully known and does not change based on how a pilot instance
  turns out. Building it in segment 2 alongside the pilot execution (not
  waiting for D7's later segment) lets it ship sooner without the same
  evidence gap. **Alternative**: bundle it with D7's later segment for a
  single unified "final documents" delivery moment -- simpler in terms of
  segment count, not recommended since it would needlessly delay a
  document that is already ready to write.
- **D9 -- Given Phase 8 is still `awaiting_approval` (not `complete`) in
  `state.json` as of this segment's own read, should Phase 10 proceed with
  pilot instances that touch Phase-8-owned artifacts (the refactor
  category's `evals/runbook.md` wording fixes) or Phase-9-flagged,
  Phase-8-adjacent content (the documentation task's `phase-08-report.md`
  frontmatter fix) before Phase 8 itself is signed off?**
  Recommendation: **proceed** -- `execution-model.md` section 3 defines
  Phase 8 `complete` as requiring both verified acceptance criteria and
  Maintainer sign-off, and per Phase 8's own D8 (`evaluations-and-
  benchmarks.md` section 8, "Phase 8 reaches `complete` when... the
  Maintainer explicitly accepts a named, dated handoff checklist for the
  remainder"), Phase 8's remaining bar is explicitly a Maintainer-paced
  acceptance action, not a blocker on other phases' own progress -- Phase
  9 already proceeded and completed while Phase 8 sat `awaiting_approval`,
  establishing the precedent this recommendation follows. The two
  specific fixes in question (runbook wording; report frontmatter) are
  both small, disclosed, uncontested corrections already named by Phase
  8's own results file and Phase 9's own spot-check, not new content this
  segment would be inventing on Phase 8's behalf. **Alternative**: hold
  both fixes until Phase 8 is explicitly signed off, treating
  `awaiting_approval` as a soft lock on any further edit to Phase-8-owned
  files -- more conservative, and defensible if the Maintainer would
  prefer Phase 8's own sign-off to happen as a clean, unmodified snapshot
  first -- but not recommended as the default, since it would leave two
  already-disclosed, low-risk documentation gaps open for no protective
  benefit, and since nothing in `execution-model.md` states that a
  `awaiting_approval` phase's own artifacts are frozen against small,
  disclosed corrective edits from a later phase.

## 10. Explicit non-goals (this segment)

- No pilot task executed. No PR opened, no commit made beyond this design
  document itself (segment 1).
- No final operating-model or maintenance document built -- only their
  outlines and source-mapping (sections 6-7) are proposed here, pending D7
  and D8.
- No fix applied to any of the disclosed gaps this segment discusses
  (stale headers, D8 lint/format, D7 branch protection, the eval-runbook
  wording gaps) -- named as pilot-instance candidates (section 3, D5),
  none executed this segment.
- No edit to `.planning/agentic-sdlc/phases/outputs/state.json` -- read
  only, for the Phase 8 status context in D9.
- No edit to any file under `.agentquilt/`, `packages/agentquilt-cli/src/`,
  `.github/`, `.claude/`, or `.codex/` -- this segment is a new
  `.docs/agentic-sdlc/` document only.
