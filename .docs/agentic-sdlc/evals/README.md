# Agentic SDLC -- Evaluations and Benchmarks

Phase 8 deliverable. This directory holds the static evaluation apparatus
for scoring the agentic development process (Phases 2-7's lifecycle
contracts, 14-role portfolio, Claude Code and Codex pipelines, provider-
native guardrails, GitHub CI integration) against real provider CLI runs.
It does not contain a runtime, a scorer, or any automation -- every file
here is either a static specification (scenarios, rubric) or a hand-
maintained record of a manually executed run (results).

Design rationale, current-state findings, and the eight Maintainer decision
points (D1-D8) governing everything in this directory live in
[evaluations-and-benchmarks.md](../evaluations-and-benchmarks.md) (the
Phase 8 segment-1 design document) -- read that first for the "why" behind
this layout; this README and the files under it are the "what," built in
segment 2 after all eight decisions were approved as recommended.

## Contents

- **[rubric.md](rubric.md)** -- the 14-dimension scoring rubric (D4): a
  hybrid scale (PASS/FAIL for 4 dimensions, a 4-point ordinal for 9, an
  observed/not-observed note for 1), with no combined numeric score.
- **[runbook.md](runbook.md)** -- step-by-step instructions FOR THE
  MAINTAINER on how to start one live scenario run against one provider,
  score it, and record the result. This is the document that resolves
  "live runs are Maintainer-initiated, never by CI and never implicitly by
  an executor" into concrete mechanics (D2, D6, D7, D8).
- **`scenarios/`** -- 12 scenario specifications, one file per scenario,
  each self-contained: starting state/fixture, input task, expected
  investigation, allowed files, prohibited files, required tests, required
  approval points, expected review findings, completion criteria, and the
  exact provider entry point on both Claude Code and Codex.
- **`fixtures/`** -- generation recipes (not committed synthetic
  repositories) for the seven scenarios that need an isolated, non-real
  fixture (D3): scenarios 1, 4, 5, 7, 8, 11, 12. Each fixture note
  describes exactly what to create on a scratch branch and how to discard
  it afterward, rather than committing a large synthetic tree that would
  need to be kept in sync with the real codebase over time. Scenarios 2,
  3, 6, 9, 10 use real, current repository state directly and have no
  fixture subdirectory here.
- **`results/`** -- one file per completed live run, split by provider
  (`claude-code/`, `codex/`), plus a hand-maintained `summary.md` rollup
  table (D5: no auto-regeneration script). Starts empty except for the
  directory scaffolding and `summary.md`'s template; populated over time
  as the Maintainer runs scenarios per the runbook.

## What this is not

Per the phase doc's own required confirmation (restated in
[evaluations-and-benchmarks.md section 7](../evaluations-and-benchmarks.md#7-confirmation-no-automation-added)):
no live LLM call is added to any CI workflow; no custom evaluator service,
scoring script, or agent-evaluation runtime exists anywhere in this
directory; no scenario is ever run in a batch or a loop by any agent,
executor, or orchestrator acting on its own initiative. Every live run
referenced by anything in this directory is started by the Maintainer,
one scenario, one provider, one session at a time, per `runbook.md`.
