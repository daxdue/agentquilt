# Agentic SDLC -- Evaluation Runbook

Source design: [evaluations-and-benchmarks.md section 6](../evaluations-and-benchmarks.md#6-the-runbook----how-live-provider-cli-runs-actually-happen)
(D2, D6, D7, D8, approved as recommended). This document is written AS
INSTRUCTIONS FOR THE MAINTAINER. No part of it is a procedure an executor,
orchestrator, or any spawned subagent carries out on its own initiative.

## READ THIS FIRST -- the constraint this document exists to satisfy

`execution-model.md` section 10 states: "Phase 8 live provider-CLI runs
are started manually by the Maintainer, never by CI and never implicitly
by an executor." This is absolute and has no scenario-specific exception.
Nothing in this runbook, including section 5 below, grants any agent
permission to run a scenario on its own initiative, in a batch, or as an
implicit continuation of other work. Every mechanism in this document
requires a specific, contemporaneous Maintainer action to begin.

## 1. Mechanics: how one scenario run is actually started

1. Pick one scenario file from `scenarios/` and one provider (Claude Code
   or Codex).
2. If the scenario needs a fixture (per that scenario file's own fixture-
   recipe link under `fixtures/`), apply it now. For scenarios reusing
   real repository state (2, 3, 6, 9, 10), this step is a no-op. For
   scenarios needing an isolated fixture (1, 4, 5, 7, 8, 11, 12), create a
   scratch branch (`scratch/eval-<scenario-slug>-<date>`) and apply the
   fixture recipe's exact content -- mirroring the pattern
   [guardrails-design.md](../guardrails-design.md)'s own Phase 6 segment 2
   already used for its own destructive-command acceptance test: create
   the scratch branch, never check it out for anything beyond the minimal
   action needed, delete it after.
3. Open a fresh Claude Code session (or Codex session) at the repository
   root, on the scratch branch (or the real branch, for scenarios reusing
   real state) -- an ordinary interactive session, the same way any other
   piece of work in this repository is started, per
   [github-provider-handoff.md](../github-provider-handoff.md).
4. Paste the scenario file's "Input task" text as the first message,
   exactly as written -- no paraphrasing, so different runs of the same
   scenario (across providers, or the same provider on different days)
   stay comparable.
5. Let the session run to its own natural stopping point: either it
   finishes the task (produces a PR Summary or, for scenario 10, a
   Release-Readiness Summary), or it stops at an approval gate. If it
   stops at a gate, record whether the stop happened at the CORRECT point
   per the scenario's "Required approval points" section, then either
   approve and let it continue within the same session, or end the run
   there if the scenario's completion criteria are about the gate stop
   itself (scenario 3 in particular).
6. Immediately after the run ends (success, gate stop, or a run judged to
   have gone off the rails), fill in a results file (section 4 below)
   while the session's transcript is still available to reference,
   scoring all 14 dimensions from [rubric.md](rubric.md).
7. Discard the scratch branch, if one was created, and confirm
   `git status` is clean before starting the next scenario.

**This is a single-scenario, single-provider, human-initiated loop,
repeated by hand as many times as chosen, never batched and never looped
by any agent.** No script, wrapper, or agent iterates over the scenario
list automatically. Nothing in this repository invokes any part of this
loop from CI, a hook, or a scheduled job.

## 2. Claude Code specifics

Use the scenario file's own "Provider entry point" field for the correct
skill/command -- `analyze-issue`, `develop-issue`, `plan-change`,
`implement-task`, `review-tree`, `fix-ci`, `/prepare-pr`,
`/release-readiness`, or a plain session message for scenarios that name
none as required (1, 7, 11, 12) -- invoked the normal way (typed or
selected in an interactive session). No new skill or command exists for
evaluation purposes; using the real pipeline is the point, so the run
reflects what a real Maintainer-initiated task looks like today, not a
specially-instrumented variant of it.

## 3. Codex specifics

Same principle. Use the scenario file's "Provider entry point" field:
`standard-development` or a narrower skill (`analyze-issue`,
`plan-change`, `implement-task`, `review-tree`, `fix-ci`, `prepare-pr`,
`release-readiness`) from `.agents/skills/`, invoked in an ordinary
interactive Codex session at the repository root. `codex exec` (Codex's
own documented non-interactive batch mode) MAY be used for one
individually-initiated scenario when explicitly chosen for that one run --
matching the phase doc's "provider-native batch or non-interactive modes
may be used explicitly" allowance -- but every invocation, batch or
interactive, is still one scenario, one command, initiated by name at the
terminal, never a multi-scenario loop.

## 4. Capturing and anonymizing results

Create `results/<provider>/<scenario-slug>-<date>.md` (a template is
provided as `results/TEMPLATE.md`; copy it, do not edit it in place).

**What "anonymized" protects against (D6):** two specific, named things,
not a general privacy concern (there is no personal data in these runs):

1. It strips fine-grained environment specifics (exact model-version
   strings, session IDs, timestamps down to the second, local machine
   specs) that would make a results file misleadingly look like a
   reproducible benchmark score when it is actually a single, point-in-
   time, single-Maintainer observation that could be mistaken for a
   controlled A/B comparison.
2. It prevents a results file from becoming an inadvertent transcript
   dump containing full tool-call payloads, which could include
   incidental file contents from the working tree beyond what the
   scenario intends to expose.

**A results file records:**

- The scenario slug and a coarse date (not a full timestamp).
- The provider name and CLI version at a coarse grain (for example
  "Claude Code, 2026-07").
- The 14 dimension ratings from `rubric.md`, each with a short evidence
  note (one to three sentences, citing file paths and command results,
  not pasted transcript text).
- The dimension-14 raw efficiency numbers, if observed (turns,
  approximate tokens, wall-clock time).

**A results file does NOT include:**

- The full session transcript.
- Any output verbatim beyond short quoted evidence snippets.
- Any credential, token, or environment value that happened to appear in
  a tool-call payload during the run.

This is a documentation discipline applied by whoever fills out the file,
not a mechanism this design builds -- no script strips anything
automatically.

## 5. Orchestrator participation -- read this section exactly, do not paraphrase it

**This section exists to prevent a future orchestrator or executor from
misreading "the Maintainer may reuse an open session" as permission for
autonomous or batch scenario execution. It is not that. Read the
conditions below as a conjunction: ALL of them must hold, every time.**

The current orchestrator session (an open, interactive Claude Code
session already being used by the Maintainer for this effort) MAY serve
as the Claude Code side of ONE scenario run, if and only if:

1. The Maintainer explicitly names ONE specific scenario, by its file
   name or number, in a message to the orchestrator.
2. That same message explicitly instructs the orchestrator to run that
   one scenario now, in the current turn.
3. The orchestrator itself is the one doing the running -- this permission
   does NOT extend to any subagent spawned via the `Agent` tool. A Phase
   Executor, or any other spawned subagent, must never run a live scenario
   under any circumstance, named-and-explicit or otherwise, because a
   subagent is by definition not the human-at-keyboard session and its
   invocation is exactly the "implicitly by an executor" pattern
   `execution-model.md` section 10 forbids, with no exception carved out
   for Phase 8.

**What this does NOT permit, stated explicitly and negatively:**

- It does NOT permit the orchestrator to decide, on its own, that now is
  a good time to run a scenario as part of "making progress on Phase 8."
- It does NOT permit running more than one scenario in response to a
  single Maintainer instruction ("run scenarios 1 through 6" is a batch
  instruction and is out of scope for this permission entirely, even
  though each individual run would nominally be "manual").
- It does NOT permit treating a general instruction like "continue
  working on the evaluation backlog" as authorization for any live run --
  only a specific, named, same-turn instruction qualifies.
- It does NOT permit a spawned Phase Executor subagent to run a live
  scenario, ever, regardless of how the orchestrator's own instructions
  to it are phrased.

**Codex has no equivalent "reuse an open session" option.** The
orchestrator is a Claude Code session by construction
(`execution-model.md` section 1); every Codex-side run requires a
separately opened Codex CLI session per section 3 above. There is no
analogous ambiguity to resolve on the Codex side because there is no
already-open Codex session to potentially misuse.

## 6. Satisfying "at least six scenarios per provider" (D2, D8)

Segment 2 of Phase 8 built every static artifact in this directory. It
did not, and does not, attempt to run all 12 scenarios against both
providers itself -- doing so in one sitting would be exactly the
"loop through scenarios autonomously" behavior forbidden above, even if
each individual run were nominally initiated inside a single executor
turn.

**What satisfies the phase's own six-per-provider acceptance bar:**

- A small number of proof-of-mechanics runs (recommended: one or two per
  provider) confirm this runbook's steps actually work end-to-end and
  produce a usable, scoreable results file. These may happen inside a
  Phase 8 segment, but only under an explicit, per-scenario Maintainer
  instruction issued in that segment (see section 5 for the Claude Code
  case; the Codex case always requires a separately opened session
  regardless of phase segment boundaries).
- The remaining runs needed to reach six-per-provider are an explicit,
  Maintainer-paced checklist, tracked in `results/summary.md`'s own
  "Scenarios run so far" section, worked through at whatever cadence
  suits real development -- for example, by using a scenario's actual
  task as a real piece of work when the opportunity naturally arises,
  rather than treating all 12 as synthetic exercises to burn through in
  one sitting. This checklist is explicitly NOT something any phase
  segment, executor, or orchestrator turn is expected to complete in one
  pass.

Per D8, Phase 8 reaches `complete` when: (a) every static artifact in this
directory is built (done, this segment); (b) at least one real, scored run
exists per provider, proving the runbook's mechanics; and (c) the
Maintainer explicitly accepts the dated handoff checklist in
`results/summary.md` for the remaining runs. Phase 8 does not wait on the
full six-per-provider count to reach `complete` -- that count is worked
through afterward, at the Maintainer's own pace, outside the
phase-executor loop entirely.

## 7. Confirmation

Per the phase doc's own required confirmation, restated here at the point
where a Maintainer is about to actually use this runbook: no live LLM call
this runbook triggers is ever added to a GitHub Actions workflow or any
other standard/required CI path; no part of this runbook's mechanics is
scripted, scheduled, or automated; every live run this runbook describes
is started by a human, deliberately, one scenario and one provider at a
time.
