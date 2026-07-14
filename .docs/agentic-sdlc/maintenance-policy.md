# Agentic SDLC -- Maintenance Policy

Date: 2026-07-14
Status: Built (Phase 10 segment 2). Source design:
[pilot-tuning-and-operating-model.md](pilot-tuning-and-operating-model.md)
section 7 (D8, approved as recommended -- written now, independent of the
deferred final operating-model document, since none of the 8 topics below
depend on pilot-run evidence). Companion documents:
[risk-and-approval-policy.md](risk-and-approval-policy.md) section 5 (the
single-maintainer-reality framing this document extends rather than
re-derives), [agent-portfolio.md](agent-portfolio.md) section 9 (the
agent-retirement build procedure section 7 below restates generically),
[guardrails-design.md](guardrails-design.md) and
[codex-pipeline.md](codex-pipeline.md) (the guardrail/hook mechanisms
section 3 below governs revalidation of),
[controlled-multi-agent-parallelism.md](controlled-multi-agent-parallelism.md)
section 6.5's own graduation-style reasoning (write-parallelism as
"authorized-but-not-yet-exercised" -- the direct precedent section 8's
graduation criteria below generalizes), [evaluations-and-benchmarks.md](evaluations-and-benchmarks.md)
and [evals/](evals/) (the benchmark apparatus section 5 below sets a rerun
cadence for).

## Purpose and scope

This document answers the Phase 10 phase doc's "Maintenance" requirement:
who owns this effort's own artifacts, on what cadence they get reviewed,
how they get revalidated after a provider upgrade, and how the whole
pipeline is safely rolled back or retired if something goes wrong or is
superseded. It applies to every artifact this nine-phase effort has
produced: the 14-agent portfolio (`agent-portfolio.md` and its sources
under `.agentquilt/agents/`), both provider pipelines
(`claude-code-pipeline.md`/`.claude/`, `codex-pipeline.md`/`.codex/`),
provider-native guardrails (`guardrails-design.md`), GitHub/CI integration
(`github-ci-integration.md`/`.github/`), the eval scenario pack
(`evaluations-and-benchmarks.md`/`evals/`), and the multi-agent
coordination contract (`controlled-multi-agent-parallelism.md`). It does
NOT apply to AgentQuilt the product (`packages/agentquilt-cli/`), which
has its own, separate maintenance practice unrelated to this effort, per
this whole effort's own standing "AgentQuilt user-facing behavior remains
independent of the development pipeline" boundary.

## 1. Owners

The Maintainer (currently the sole human in this repository's governance
model, per `risk-and-approval-policy.md` section 5 and
[ADR-0004](../architecture/adr/ADR-0004-ai-assistance-authority-model.md)'s
authority model -- "agents draft and recommend; humans approve, merge, and
release") owns every agent/skill source file, every provider configuration
file, and every gate policy this effort has produced. No distributed
ownership model is proposed here, because there is exactly one human role
in this repository's current governance -- this is stated as the current
state, explicitly revisitable the day a second maintainer joins (at which
point ownership would need to be split by area, most naturally along the
same lines this document's own scope paragraph already draws: portfolio
owner, Claude Code pipeline owner, Codex pipeline owner, guardrails owner,
CI owner, eval-pack owner).

## 2. Review cadence

No fixed calendar cadence (for example "monthly" or "quarterly") is
imposed. This repository's own development pace is irregular -- a fixed
calendar cadence would either sit idle when nothing has changed, or lag
behind a burst of real activity when a lot has. Instead, review is
triggered by events, specifically:

- A provider CLI (Claude Code or Codex) version upgrade (see section 3).
- A pilot instance (per `pilot-tuning-and-operating-model.md` section 3,
  or any future real-work run through this pipeline) surfacing a tuning
  candidate -- a verbose agent, a redundant role, a mis-triggering
  description, an over-broad write permission, a noisy or under-firing
  hook (per that design doc's own section 5 tuning-action list).
- The start of a new phase-shaped effort, or a significant real-work
  milestone, that touches the portfolio, either pipeline, the guardrails,
  or the eval pack directly.
- A disclosed, unresolved follow-up item accumulating unaddressed for a
  long stretch of real development activity (a judgment call, not a
  timer -- for example, the two `evals/runbook.md` follow-ups disclosed by
  Phase 8's own scenario-1 run, or the pre-existing 48 em-dash characters
  in `claude-code-pipeline.md` disclosed by this phase's own
  documentation-currency pilot instance, both good candidates for the NEXT
  event-triggered review pass touching those specific files, not urgent
  enough to trigger one on their own).

This mirrors this effort's own actual nine-phase history -- each phase was
triggered by deliberate Maintainer initiation in response to a real need,
never a calendar.

## 3. Provider-version compatibility checks

Whenever the Maintainer upgrades the Claude Code or Codex CLI version, run
both of the following before trusting the upgraded session for real work:

1. **One guardrail empirical test per provider** -- attempt a known-denied
   action on a scratch branch (never `main`, never pushed) and confirm it
   is still blocked:
   - Claude Code: attempt an `Edit`/`Write` on `CLAUDE.md` (or any
     `.claude/agents/*.md`) directly; confirm `.claude/settings.json`'s
     `permissions.deny` still fires with a visible denial reason in the
     transcript.
   - Codex: attempt the equivalent `apply_patch`-shaped edit against the
     same generated-file set; confirm `.codex/hooks.json`'s `PreToolUse`
     hook (`pretooluse-guard.sh`) still fires. Separately, attempt a
     denied absolute-rule command (for example `git push --dry-run` is
     NOT sufficient evidence since it does not match the deny pattern the
     same way a real `git push` would -- use a genuinely matching but
     inert form, or inspect the hook's own matcher logic directly against
     the command string without executing it, per this effort's own
     standing "never actually perform a destructive or publishing
     operation to prove a guardrail" discipline).
   This mirrors `guardrails-design.md`'s own segment-2 acceptance-test
   pattern (scratch branch, minimal action, immediate revert/delete) --
   no new mechanism, reused directly.
2. **A custom-agent/skill discovery check**:
   - Codex: `codex exec "list the custom agents available to you in this
     project"` (non-interactive, human-run), confirming all 14 names still
     appear -- this is `codex-pipeline.md` section 10's own
     already-specified validation-plan item, restated here as a recurring
     check rather than a one-time build-time step.
   - Claude Code: in a plain interactive session, confirm the 14
     `.claude/agents/*.md` files are still recognized and invocable by
     name (no new tooling needed -- this is an ordinary session
     observation, not a scripted check).

Both checks are cheap (a few minutes each), provider-native (no new
tooling), and produce a clear pass/fail the Maintainer can act on
immediately -- if either fails, treat it as a `blocked`-severity finding
against this effort's own artifacts until resolved, since a silently
broken guardrail is exactly the kind of regression this whole effort
exists to prevent.

## 4. Prompt and agent review policy

Any edit to an `.agentquilt/agents/<name>/` source fragment (not the
compiled output, which is never hand-edited per this repository's standing
Generated Files Policy) goes through the same review discipline as any
other source change in this repository -- an agent definition is source
code for this repository's own development process, not a lighter-review
category:

- **Wording-only edits** (clarifying an existing instruction, fixing a
  typo, tightening a sentence without changing the role's own scope or
  triggers): `documentation-reviewer`-equivalent review at minimum
  (fragment-currency, consistency with the role's own contract in
  `agent-portfolio.md` section 6) -- for a single-maintainer repository,
  this can be the Maintainer's own direct read-and-approve, but the check
  itself (does this fragment still match what the role's contract in
  `agent-portfolio.md` says, does it still compile and pass
  `npx agentquilt check`) is not skipped just because it is quick.
- **Scope, trigger, or specialist-routing changes** (a core-role
  redefinition, a new or removed specialist trigger, a change to which
  stage a role participates in): `architecture-reviewer`-equivalent review
  in addition to the above -- this is a change to the routing matrix
  `agent-portfolio.md` section 5 documents, and should be checked against
  that document's own consistency the same way a code change touching a
  routing table would be reviewed.
- **Any edit to a provider configuration file** (`.claude/settings.json`,
  `.codex/config.toml`, `.codex/hooks.json`, or a hook script) is
  treated as inherently higher-stakes than an ordinary fragment edit,
  regardless of how small the diff looks -- see section 6 below, which
  defines this specifically.
- Every edit, regardless of category, ends with `npx agentquilt build`
  and `npx agentquilt check` (exit 0, zero drift) before being considered
  complete -- unchanged from this repository's own standing Generated
  Files Policy, restated here because it applies to this effort's own
  agent sources exactly as it does to any other AgentQuilt-managed agent.

## 5. Benchmark rerun cadence

Tied to Phase 8's own eval pack (`evals/`), not a separate schedule. Rerun
a scenario (or a Phase-10-style real pilot instance) when:

- **The pipeline it exercises changes materially** -- a new skill, a
  changed guardrail, a portfolio role change, or a provider-version
  upgrade (section 3) that could plausibly change how a scenario's
  provider entry point behaves.
- **Enough real calendar time has passed that an existing scored run's own
  disclosed fidelity limitation is worth re-testing blind.** Concretely:
  Phase 8's own scenario-1 run (`evals/results/claude-code/
  01-isolated-bug-fix-2026-07.md`) discloses a self-administration
  limitation (the same session that planted the fixture also
  "investigated" it); a rerun by a different session, or after enough
  time that the fixture specifics are no longer fresh in context, would
  produce a more meaningful score on that run's own flagged dimensions (2
  and 8) specifically.
- **A disclosed follow-up from a prior run has been acted on** -- for
  example, once `evals/runbook.md`'s two disclosed wording gaps (the
  discard-step revert wording; the dimension-9 reviewer-delegation
  ambiguity) are resolved, the next scenario run using the corrected
  runbook is itself a natural validation that the correction actually
  clarified the ambiguity in practice, not just on paper.

No fixed number of weeks or months is proposed, consistent with section
2's event-triggered reasoning above -- the eval pack's own
`evals/results/summary.md` "Scenarios run so far" table remains the single
source of truth for what has and has not been scored recently, checked at
each event-triggered review (section 2), not on its own separate timer.

## 6. Documentation update triggers

- **A design document's status header must be corrected the moment its own
  segment-2 (or later) build lands.** The "Proposal... Not yet built" ->
  "Built" pattern `agent-portfolio.md` and (as of Phase 7) `github-ci-
  integration.md` already followed correctly is the standard; Phase 10's
  own documentation-currency pilot instance found three sibling documents
  (`claude-code-pipeline.md`, `codex-pipeline.md`, `guardrails-design.md`)
  that had NOT followed it, sitting stale since their own Phase 4/5/6
  builds respectively. This is now a standing checklist item on every
  future phase's (or any future design document's) own segment-2
  completion step: update the status header in the same commit that lands
  the build, not as a separate, easily-forgotten follow-up.
- **A decision recorded as "D<n>" in a design document that is later
  revised or overridden by a subsequent phase or build segment must have
  that revision folded back into the ORIGINAL document's own text**, not
  left as a comment buried in a generated config file's header where a
  reader of the original design document would never see it. This is
  exactly what happened to Codex's D1 (revised, Phase 5 segment 3) and D6
  (overridden, Phase 6) before Phase 10's own documentation-currency pilot
  instance corrected it -- the fix pattern going forward: when a later
  phase's own build changes what an earlier phase's own "D<n>" decision
  actually produced, that later phase's own report should include a
  one-line pointer edit to the earlier document (mirroring how Phase 9
  segment 2 added a one-line pointer from `handoff-contract.md` rule 5 to
  the newly-approved `controlled-multi-agent-parallelism.md`), or, if the
  divergence is substantive (not just a pointer but a real content change,
  as with Codex's D1/D6), a full correction of the earlier document's own
  D<n> text, dated and attributed to the correcting phase, with the
  original text preserved inline (not silently deleted) so the historical
  record of what was originally decided remains legible -- exactly the
  pattern this phase's own documentation-currency pilot instance used.
- **A phase report's own frontmatter `commits:` list must stay current**
  as additional commits land under that phase's own scope after the
  report's initial write -- Phase 8's own `phase-08-report.md` was found
  missing its own third commit (`e5e68a3`) until Phase 10's own
  documentation-currency instance added it. Going forward: whenever a
  phase report is reopened for a later segment (or, as happened here,
  corrected by a LATER phase acting on that earlier phase's own disclosed
  staleness), the `commits:` list should be checked against `git log`
  directly, not assumed current from memory.

## 7. Rollback procedure

Every artifact this effort produces is either (a) a plain-text design/
contract document under `.docs/agentic-sdlc/`, (b) a compiler-managed
agent source under `.agentquilt/agents/` plus its generated output under
`.claude/agents/`, or (c) a provider configuration file
(`.claude/settings.json`, `.codex/config.toml`, `.codex/hooks.json`,
`.codex/agents/*.toml`, `.agents/skills/*/SKILL.md`). All of it is
ordinary Git-tracked content with no runtime state, no database, and no
external side effect (confirmed directly, `pilot-tuning-and-operating-model.md`
section 8.2 -- there is no custom execution runtime anywhere in this
effort). Rollback is therefore always:

1. `git revert` of the specific commit(s) that introduced the problem
   (never a hard reset on shared history, per this repository's own
   standing Git Safety Protocol).
2. For a compiler-managed source change specifically (an
   `.agentquilt/agents/<name>/` fragment or manifest edit): follow the
   revert with `npx agentquilt build` to regenerate the now-reverted
   output, then `npx agentquilt check` to confirm zero drift -- the revert
   is not complete until the generated output matches the reverted source
   again.
3. For a provider configuration file (guardrail, hook, or `.codex/`
   registry file): follow the revert with the section 3 empirical
   guardrail test (attempt the previously-denied action on a scratch
   branch, confirm the pre-change behavior is restored) -- a config revert
   that looks correct in the diff should still be empirically re-verified
   before being trusted, matching this effort's own standing "verify
   before accepting" discipline (`controlled-multi-agent-parallelism.md`
   section 5.7) applied to a rollback instead of a fan-out.

No special rollback tooling is needed or proposed, consistent with this
whole effort's "no custom runtime" constraint -- a revert-then-rebuild-
then-reverify sequence using only `git` and `agentquilt`'s own existing
commands is sufficient for every artifact category this effort has ever
produced.

## 8. Criteria for graduating experimental workflows

Mirroring `controlled-multi-agent-parallelism.md` section 6.2's own D7
reasoning (write-parallelism is "authorized-but-not-yet-exercised," not yet
"routine," by deliberate design choice rather than oversight), a workflow
or coordination-contract mode graduates from experimental to routine
default status when ALL of the following hold:

1. **At least 2-3 real, successful pilot or real-development uses**, with
   no unresolved BLOCKER or HIGH finding from an independent review of any
   of those uses.
2. **No open correction-limit exhaustion** in any of those uses --
   `execution-model.md` section 9's own 2-corrective-iteration limit for a
   failing check, or `controlled-multi-agent-parallelism.md` section 6.5's
   write-parallel-specific 2-round integration-correction limit, whichever
   applies to the workflow in question. A mode that has needed its
   correction limit's outer bound more than once across its trial uses is
   not yet graduation-ready, regardless of how many trials it has
   accumulated.
3. **An explicit Maintainer decision, recorded the same way every other
   phase decision in this effort has been recorded** -- a lettered
   D-decision in the relevant design document, updated in place to reflect
   the graduation (mirroring how this same document's own section 6 above
   describes folding a later revision back into an earlier document's own
   text, applied here to a graduation decision specifically).

Concretely, applying this today: write-parallelism
(`controlled-multi-agent-parallelism.md` section 6) remains experimental
-- it has zero trial uses on record as of this document's own writing, not
2-3, so it does not meet criterion 1 regardless of how well-specified its
own mechanism (sections 6.1-6.5 of that document) already is. It graduates
only once real trials exist to evaluate against this criteria set, not by
this maintenance document's own say-so, and not merely because its design
has been approved and documented.

## Non-goals

No new tooling, script, or automation is introduced by this document. Every
mechanism named above (the guardrail empirical tests, the discovery
checks, the revert-then-rebuild-then-reverify rollback sequence) is either
an existing repository command (`git`, `npx agentquilt build`/`check`,
`codex exec`) or a manual, Maintainer-performed observation -- consistent
with this whole effort's own standing "no custom execution runtime, no
telemetry service" constraints.
