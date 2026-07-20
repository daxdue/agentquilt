# Agentic SDLC — Implementation Backlog

Date: 2026-07-11
Status: Phase 0 deliverable. Reconciles the phase specifications
(`.planning/agentic-sdlc/phases/phase-01` through `phase-10`, local/gitignored)
with the findings of [current-state-audit.md](current-state-audit.md). Each
phase below records scope, non-goals, risks, and acceptance criteria. Where a
phase doc already defines acceptance criteria, they are summarized and extended
only with audit-derived checks; the phase doc remains authoritative for its own
criteria.

Human approval gates (per the master prompt) are marked GATE.

---

## Phase 1 — Boundary Cleanup and Legacy Removal

**Scope** (audit sections 0, 7, 9):

1. GATE — Disposition of the uncommitted working-tree restructure (~205
   changes): commit it as the new baseline on a branch/PR before any removal
   work. Includes deciding open questions 2 and 3 from the audit (orphaned
   `AGENTS.md`/`CLAUDE.md` project-guide sources; orphaned
   `.agents/skills/new-agent/SKILL.md`).
2. Rebuild the tampered `.claude/agents/agent-registry.md` via `npx agentquilt
   build` so `agentquilt check` passes (audit R2).
3. GATE (destructive) — Remove dead API-invocation surface:
   `packages/agentquilt-cli/src/integration/claude-agent.ts`,
   `packages/agentquilt-cli/tests/claude-agent.test.ts`, `@anthropic-ai/sdk`
   devDependency.
4. GATE (destructive) — Archive or remove API-era documentation:
   `PHASE_3_1_COMPLETION.md`, `PHASE_3_3_COMPLETION.md`,
   `PHASE_3_COMPLETION.md`, `ENVIRONMENT_SETUP.md`,
   `integration/agent-invocation.md`, `integration/phase3-timeline.md`,
   `CLAUDE_CODE_ONLY_AGENTS.md`, `SDLC_STLC_REVIEW_SUMMARY.md`,
   `TEST_AGENT_CODE_REVIEW.md`. Archived material goes under an explicit
   historical location marked non-current.
5. Update status fragments/instructions so the project guide (once its source
   disposition is decided) states that agents are invoked through provider
   CLIs; remove Phase 3.x "completed API integration" claims. Edit canonical
   fragments and rebuild — never the generated files.
6. Scrub `policies/gates/*.yaml` `aiAssistance` blocks and workflow comments of
   API-era references (`intake.yml` link to PHASE_3_COMPLETION.md); leave gate
   policies themselves intact.

**Non-goals**: removing provider-native agents; removing gate policies because
they are unautomated; introducing any replacement runtime; adding Claude
Code/Codex execution assets; changing product behavior; fixing release.yml
placeholder checks (Phase 7).

**Risks**: destroying the only copy of the de-facto baseline (commit first,
delete second); deleting historical meta-agent content without a mapping (HEAD
holds the pre-restructure tree — record the mapping before the restructure
commit buries it); breaking the published package by touching `package.json`
(devDependency removal only); CI red if drift not rebuilt first.

**Acceptance criteria** (phase doc, plus audit additions):

- No Anthropic/OpenAI SDK remains solely for development-agent execution.
- No active CI workflow calls a model API (already true — verify it stays true).
- Current documentation states agents are invoked through provider CLIs.
- Historical API-integration docs removed or clearly archived.
- Build and tests pass; `agentquilt check` exits 0 (audit: currently exits 1).
- Published package behavior unchanged.
- Audit additions: the restructure baseline is committed with an explanatory
  message; the orphaned-file decision is recorded; `git status` is clean at
  phase end.

---

## Phase 2 — Shared Agentic SDLC Contract

**Scope**: author the nine provider-independent contract documents under
`.docs/agentic-sdlc/` (lifecycle, task-classification, risk-and-approval-policy,
investigation-contract, implementation-plan-contract, review-contract,
validation-evidence, handoff-contract, completion-contract); define the three
workflow profiles (small/standard/high-risk); define standard artifact formats
(classification, investigation, plan, handoff, review findings with
BLOCKER/HIGH/MEDIUM/LOW/SUGGESTION severities carrying evidence, impact, and
verification method; validation evidence; PR summary; release-readiness
summary). Reconcile with the existing `.docs/sdlc/lifecycle.md` and `gates.md`
(G0-G6) rather than duplicating them: the new contracts govern day-to-day
development execution; existing gates map onto profile checkpoints.

**Non-goals**: any software runner or automation; provider-specific files;
rewriting `.docs/sdlc/` wholesale; changing policies/gates semantics.

**Risks**: contract overweight for a single-maintainer project (audit R9) —
keep the small profile genuinely small; divergence between new contracts and
legacy `.docs/sdlc/` docs creating two sources of truth (cross-reference and
mark precedence explicitly).

**Acceptance criteria** (phase doc): lifecycle executable manually without a
provider; no runner; explicit human approval points; every stage has entry/exit
criteria, inputs, outputs; contracts reference AgentQuilt-specific concerns
(generated files, deterministic output, fixtures, schemas, compatibility).
Audit addition: contracts name the authoritative commands from audit section 2
rather than inventing new ones.

---

## Phase 3 — Development-Agent Portfolio Rationalization

**Scope**: transform the 46-agent working-tree portfolio into ~8 core lifecycle
agents + conditional specialists per the disposition table in audit section 6;
write the full role contract for every retained agent; produce the inventory/
disposition table, routing matrix, responsibility matrix, and specialist-trigger
matrix; retire duplicates, stubs, and runtime-implying concepts
(main-orchestrator, agent-registry, etc.) with a documented mapping; restore
`test-runner`'s execution capability (audit R5) and give the implementer role
write access; edit canonical `.agentquilt/` sources and rebuild.

GATE: this phase changes generated-output semantics and restructures the agent
set — Maintainer approval required on the disposition table before edits, and
on the compiled results. Open question 1 (dogfooding vs. hand-authored
`.claude/` files) must be decided at or before this phase's first gate, since
it determines whether sources or native files are edited.

**Non-goals**: adding compiler features to support richer agent frontmatter
(work within existing manifest capabilities or hand-authored exceptions);
building an orchestrator; deleting git history of prior agents.

**Risks**: losing the useful content identified in the audit (eval-designer,
security-review, code-review, test-runner, risk-register) during consolidation;
permissions model may be too coarse (`read-only` maps to Read/Grep/Glob — the
test engineer needs execution; verify the manifest can express this without
product changes, else hand-author that agent and document why); recreating
"completeness theatre" with too many specialists.

**Acceptance criteria** (phase doc): one accountable primary role per lifecycle
stage; duplicates removed or justified; core agents have usable workflows, not
placeholders; read-only vs. write-capable roles distinguishable; agent count
driven by responsibility; product behavior unchanged. Audit additions: the 8
required roles all exist and are discoverable; `agentquilt check` passes; the
retirement mapping references pre-restructure history (HEAD before Phase 1
commit).

---

## Phase 4 — Claude Code-Native Development Pipeline

**Scope**: implement the standard development loop with Claude Code-native
mechanisms only: project instructions, the Phase 3 agents, skills (commands
only where clearly better), settings, permission rules, hooks (minimal — full
guardrails are Phase 6), subagent delegation. Skills for: analyze-issue,
plan-change, develop-issue, implement-task, review-tree, fix-ci, prepare-pr,
release-readiness. The develop-issue loop follows the 13-step sequence in the
phase doc, pausing at approval points; validate with one representative small
task end-to-end and one medium task that pauses at the correct human gate.

**Non-goals**: Codex work; custom TS/JS harness of any kind; new model
API/SDK; AgentQuilt product features; full guardrail coverage (Phase 6);
parallel implementation (Phase 9).

**Risks**: skills/agent syntax drift across Claude Code versions (verify
against the installed version, as the phase doc requires); a single
general-purpose session doing everything without independent review (explicitly
prohibited); hand-authored `.claude/skills/` coexisting with compiler-managed
`.claude/agents/` — document the ownership boundary so `check`/build never
fight hand-authored files.

**Acceptance criteria** (phase doc): a maintainer can start one Claude Code
workflow and receive a complete, reviewable engineering result; no model
API/SDK added; no product feature added; existing tests pass; Claude-specific
configuration documented. Audit addition: validation includes confirming agents
cannot edit generated files during the representative tasks.

---

## Phase 5 — Codex-Native Development Pipeline

**Scope**: implement the same engineering policy with Codex-native mechanisms:
root `AGENTS.md` (must be made current first — audit R3), `.codex/config.toml`,
`.codex/agents/*.toml` (read-only explorer/planner/reviewers, workspace-write
implementer via native sandbox settings), repo-scoped skills under
`.agents/skills/`, hooks config, approval policies. Implement the 10-step
standard-development skill per the phase doc. Instruction-only skills
preferred.

**Non-goals**: mechanical translation of Claude files; an AgentQuilt Codex
adapter built for this SDLC (explicitly banned by the phase doc — the deferred
product adapter remains a separate product decision); scripts where
instructions suffice.

**Risks**: `AGENTS.md` is currently a stale orphan — Codex would load wrong
instructions (must be resolved in Phase 1 disposition); Codex feature surface
differs from Claude (document intentional divergence rather than abstracting);
duplication maintenance burden across providers.

**Acceptance criteria** (phase doc): Codex executes the complete standard
lifecycle without an SDK; configuration independently understandable; no
compiler feature introduced; provider-specific duplication documented; product
behavior unchanged.

---

## Phase 6 — Provider-Native Guardrails, Permissions, and Hooks

**Scope**: enforce the guardrail list (generated-file edits, unapproved
dependencies, destructive git, publication/tagging/release, public-interface
and persisted-format changes, schema compatibility, generated-output drift,
skipped validation, unexplained fixture updates, secret exposure, scope
expansion) using native permission rules, prompt/lifecycle hooks, and existing
repository commands (`agentquilt check`, npm scripts). Session-start context
surfacing; pre-completion validation checks. Run the controlled acceptance
tests from the phase doc and document block/approve/detect outcomes per
provider.

GATE: any hook helper addition that requires a new package.json dependency.

**Non-goals**: custom policy engine; Node/Python/TS orchestration service;
hooks that make model calls or silently mutate product files.

**Risks**: hooks blocking legitimate work (the repo's own hook lesson: infra
errors must never block sessions); provider hook APIs changing under upgrades;
false sense of safety — hooks detect, humans decide.

**Acceptance criteria** (phase doc): both providers enforce the same policy
outcome natively; no custom runtime; hooks make no model calls and do not
mutate product files silently; normal development remains practical. Audit
addition: `agentquilt check` (now covering agent outputs) is wired as the
generated-drift detector.

---

## Phase 7 — GitHub and Deterministic CI Integration

**Scope**: issue forms for bug (currently missing entirely), feature,
refactoring, documentation, provider compatibility, release task — collecting
the intake fields in the phase doc; evidence-carrying PR template (linked
issue, classification, plan, tests executed, generated-output changes, fixture
explanations, compatibility/docs impact, review findings, limitations,
follow-ups); CI hardening: add lint, secret scanning, dependency checks,
package validation; replace release.yml placeholder checks (echoed OKs,
hardcoded issue #1 comment) with real deterministic checks or remove them;
align coverage thresholds between CI and `pr-quality-gate.yaml`; make
CODEOWNERS honest for a single-maintainer repo; document how maintainers hand
issues/PRs to the provider CLIs (`gh` or native integration).

**Non-goals**: model calls in CI; provider-native GitHub Actions as required
gates; custom API-invocation layers; autonomous labels ("agent-approved").

**Risks**: intake friction for a solo maintainer (forms should have sensible
optional fields); existing open issues predating the forms.

**Acceptance criteria** (phase doc): issues sufficient for reliable intake;
PRs carry auditable loop evidence; CI deterministic and model-free; human
approval required for merge and release; no workflow falsely described as
autonomous. Audit addition: no workflow references archived Phase 3.x docs.

---

## Phase 8 — Agentic SDLC Evaluations and Benchmarks

**Scope**: author the 12-scenario pack (per phase doc list, including
generated-file edit attempt and prompt-injection scenarios that map directly to
audit risks R6/R8 and the security agents' content); define per-scenario
expected investigation, allowed/prohibited files, required tests, approval
points, expected findings, completion criteria; one shared scoring rubric
across providers; execute at least six scenarios per provider through the real
CLIs (manual/batch, started by the Maintainer); store prompts, rubric,
anonymized summaries, observed failures, and resulting configuration changes.

**Non-goals**: custom evaluator service or agent-evaluation runtime; live LLM
calls in standard CI; conflating provider limitations with instruction defects
(scoring must separate them).

**Risks**: evaluation cost/time on a solo project — keep scenarios small and
reusable; repo state pollution from runs (use worktrees/fixtures per scenario).

**Acceptance criteria** (phase doc): >= 6 scenarios executed per provider;
comparable via one rubric; failures produce concrete pipeline improvements;
provider limitations distinguished from instruction defects; no custom runtime.

---

## Phase 9 — Controlled Multi-Agent Parallelism

Entry condition: Phases 4-8 declared stable by the Maintainer.

**Scope**: parallel read-heavy work (codebase mapping, test-surface analysis,
doc impact, security/compatibility review, independent PR review); parallel
implementation only for independently bounded, non-overlapping tasks in
isolated worktrees with defined integration order and mandatory reconciliation
review; define the coordination contract (max concurrency, parent
responsibilities, assignment/output formats, shared-file restrictions, conflict
handling, failure propagation, cancellation, synthesis requirements) and the
stopping rules from the phase doc.

**Non-goals**: custom scheduler; concurrent writes to overlapping files;
parallelism as the default for small work.

**Risks**: reconciliation cost exceeding parallelism benefit; repository state
changing under parallel analysis (a defined stopping rule).

**Acceptance criteria** (phase doc): a large representative task completes with
parallel analysis; measurable benefit; no conflicting writes; final integration
independently reviewed; sequential remains the default.

---

## Phase 10 — Pilot, Tuning, and Operating Model

**Scope**: pilot the pipeline on real AgentQuilt work (low-risk bug, medium
feature, refactor, provider-output change, documentation task, CI failure,
release preparation, one high-risk architecture/schema task), using both
providers where practical; record the phase-doc metrics from repository
documents and PR evidence (no telemetry service); tune agents, hooks, routing,
and workflow complexity by evidence; write the final operating-model and
maintenance documentation (workflow selection, provider selection, update and
retirement procedures, provider-upgrade validation, rollback, new-provider
introduction without a runtime).

**Non-goals**: telemetry/metrics services; keeping unused agents "just in
case"; expanding scope into product features.

**Risks**: pilot tasks chosen too synthetic to expose defects (use the real
backlog); tuning churn without evidence.

**Acceptance criteria** (phase doc): full lifecycle used on real work;
provider workflows documented and maintainable; default small/standard/
high-risk workflows established; obsolete agent definitions removed or
archived; no custom execution runtime; AgentQuilt user-facing behavior
independent of the pipeline.

---

## Cross-phase dependencies (from the audit)

| Dependency | Blocks |
| ---------- | ------ |
| Restructure baseline committed (Phase 1, gate) | Everything: no later phase can safely branch or diff |
| Orphaned CLAUDE.md/AGENTS.md disposition (Phase 1 gate, open question 2) | Phase 4 (Claude instructions) and Phase 5 (Codex instructions) |
| Dogfooding decision (open question 1) | Phase 3 (which files are canonical for agents) |
| Drift check green (Phase 1) | All CI-dependent acceptance criteria |
| Role portfolio (Phase 3) | Phases 4, 5 agent wiring |
| Contracts (Phase 2) | Phases 4, 5 skills content; Phase 8 rubric |
