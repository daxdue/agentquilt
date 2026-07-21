# Agentic SDLC — Target Operating Model

Date: 2026-07-11
Status: Target design (Phase 0 deliverable; refined by Phases 2-10)
Companion documents: [current-state-audit.md](current-state-audit.md),
[implementation-backlog.md](implementation-backlog.md),
ADR-0012 (provider-native agentic SDLC boundary).

## 1. Purpose

Define the end state the Phases 1-10 effort builds toward: a provider-native
agentic software development lifecycle for the AgentQuilt repository itself.
This is development infrastructure and process, not an AgentQuilt product
feature. Nothing here changes what the `agentquilt` CLI does for its users.

## 2. Governing constraints

These bind every phase and every asset in the target state:

1. **Provider-native only.** LLM execution happens exclusively inside provider
   CLIs (Claude Code, Codex) driven by a human. No custom runtime, SDK
   integration, orchestration service, workflow engine, or AgentQuilt command
   executes the pipeline.
2. **No product coupling.** The pipeline adds no AgentQuilt features, compiler
   changes, or CLI commands. Dogfooding existing product capabilities (the
   compiler, `build`, `check`) is permitted and encouraged.
3. **Canonical sources only.** Agents and humans edit sources; generated files
   (`.claude/agents/*.md` when managed, `agentquilt.lock`, compiled instruction
   files) are rebuilt with `npx agentquilt build`, never hand-edited.
4. **Humans own decisions.** Consistent with ADR-0004: agents investigate,
   plan, implement bounded tasks, and review; humans approve plans for
   non-trivial work, approve gate triggers (architecture, public interface,
   dependency, persisted format, generated-output semantics, destructive
   operations, release), merge, and release.
5. **Deterministic CI.** Default CI runs no model. Quality gates in CI are
   reproducible commands (typecheck, tests, coverage, build, drift check, lint,
   scans).
6. **GitHub is the system of record.** Issues carry intake evidence; PRs carry
   the engineering evidence produced by the agentic loop; CI records
   deterministic verification.
7. **Plain text.** No emojis or pictographic symbols in any authored asset
   (repo emoji policy).

## 3. Operating picture

```
Maintainer
   |
   |  starts a workflow (issue URL, task description, or PR)
   v
Provider CLI session (Claude Code or Codex)
   |-- loads project instructions (CLAUDE.md / AGENTS.md — always current)
   |-- selects workflow profile via skill (small / standard / high-risk)
   |-- delegates to role agents:
   |     read-only:  repository analyst, planner, all reviewers
   |     write:      feature implementer (only after plan exists),
   |                 test engineer (execute tests)
   |-- pauses at human gates (plan approval, gate triggers)
   |-- produces evidence (investigation, plan, review findings, validation)
   v
GitHub PR with evidence  -->  deterministic CI  -->  human review + merge
```

There is no daemon, scheduler, or bot account. Every run starts and ends with
the Maintainer.

## 4. Role model

### 4.1 Core lifecycle roles (one accountable primary per stage)

| Role | Access | Responsibility | Never does |
| ---- | ------ | -------------- | ---------- |
| Repository analyst | read-only | Evidence-backed investigation of code, tests, docs, history for a task | Edit files, propose final decisions |
| Implementation planner | read-only | Task classification, bounded task breakdown, risk flags, file-impact map | Implement |
| Feature implementer | write (worktree) | Execute exactly one approved bounded task; run focused tests | Start without a plan; expand scope; touch generated files directly |
| Test engineer | write + execute | Select, run, and report tests; add missing coverage for changed code | Weaken assertions to pass; update fixtures without explanation |
| Architecture reviewer | read-only | Design conformance, ADR necessity, schema/public-interface impact | Approve own suggestions |
| Regression reviewer | read-only + execute checks | Behavior deltas, generated-output drift, golden/fixture diffs, compatibility | Regenerate outputs silently |
| Documentation reviewer | read-only | Doc impact and staleness (CLAUDE.md/AGENTS.md currency is an explicit check) | Rewrite docs beyond findings |
| Release reviewer | read-only | Release readiness evidence: CHANGELOG, version, risk register, drift | Publish, tag, or push |

### 4.2 Conditional specialists (trigger only when relevant)

Security review, schema design, compatibility, deterministic-output/golden-file
discipline, eval design, performance, dependency/supply-chain risk, developer
experience, migration, requirements ambiguity. Seeds for most of these already
exist (see audit section 6); Phase 3 rewrites them under the role contract.

### 4.3 Role contract (every retained agent)

Purpose, triggering conditions, inputs, required repository investigation,
tool/permission scope, prohibited actions, output format, completion criteria,
handoff destination, read-only vs. write. Review is always independent from
implementation. No agent merges, approves, publishes, or overrides CI. No
"orchestrator" agent exists; sequencing lives in skills and the human session.

## 5. Workflow profiles

Defined in detail by the Phase 2 contracts; summarized:

- **Small change** (isolated, low risk): investigate → implement → focused
  tests → diff review → completion checks → summary. Single session, no
  mandatory plan approval.
- **Standard change**: classify → investigate → plan → (approval if flagged) →
  bounded implementation → focused verification → independent review →
  correction loop → regression review → documentation review → full validation
  → PR preparation.
- **High-risk change** (schemas, public interfaces, security, release
  behavior, persistence, compiler semantics): adds parallel read-only
  investigation, architecture plan, mandatory human approval, ADR when
  required, specialist reviews, compatibility verification, full evidence
  package, human-controlled merge/release.

Risk classification (small/standard/high) is the first step of every workflow
and is recorded in the PR.

## 6. Provider mapping

The engineering policy (roles, profiles, gates, evidence) is provider-neutral
and lives in `.docs/agentic-sdlc/`. Each provider implements it natively:

| Concern | Claude Code | Codex |
| ------- | ----------- | ----- |
| Project instructions | `CLAUDE.md` (current, regenerable or hand-maintained per open question 1) | root `AGENTS.md` (same content source) |
| Role agents | `.claude/agents/*.md` | `.codex/agents/*.toml` (hand-authored) |
| Workflows | `.claude/skills/*` (commands only where skills fit poorly) | `.agents/skills/*/SKILL.md` + `.codex` config |
| Guardrails | settings permission rules + hooks | sandbox modes + approval policies + hooks config |
| Read-only vs write roles | tool restrictions per agent | per-agent sandbox (read-only vs workspace-write) |
| Delegation | subagents / Agent tool | Codex subagents |
| GitHub access | `gh` CLI or native integration | `gh` CLI or native integration |

Intentional duplication between providers is documented, not abstracted away —
no shared runtime or translation layer is built.

Guardrail policy outcomes must match across providers (Phase 6): generated-file
edits blocked or flagged, dependency additions require approval, destructive
git and publication blocked, completion requires validation evidence and drift
check.

## 7. GitHub and CI in the target state

- **Issue forms** (bug, feature, refactoring, documentation, provider
  compatibility, release task) collect problem, expected behavior, acceptance
  criteria, reproduction, risk indicators, compatibility/generated-output/docs
  impact, test expectations.
- **PR template** carries: linked issue, classification, approved plan or
  rationale, implementation summary, design decisions, tests executed,
  generated-output changes, fixture explanations, compatibility and docs
  impact, review findings with resolutions, limitations, follow-ups.
- **CI (deterministic, model-free)**: install integrity, lint, typecheck, unit
  and integration tests, coverage, build, `agentquilt check` drift gate
  (including agent-definitions outputs), golden tests, package validation,
  secret scanning, dependency checks. Provider-run evaluations (Phase 8) are
  manual and never a required CI gate.
- **Release** remains human-approved: the Maintainer decides when to merge the
  Changesets Version Packages PR, while the pinned workflow performs version,
  package-tag, GitHub Release, and npm publication mechanics. The release
  reviewer produces readiness evidence beforehand and never executes a
  release step.

## 8. What is explicitly out of scope, forever (for this pipeline)

- Any `agentquilt` CLI command that runs, schedules, or scores agents.
- Any API/SDK invocation layer (the Phase 3.1-3.3 approach is retired and
  archived, not resurrected).
- Model calls in default CI.
- Autonomous merge, tag, or publish.
- A meta-agent "registry/orchestrator" layer implying a custom runtime.

## 9. Maintenance (finalized in Phase 10)

- Owner: the Maintainer; review cadence tied to provider version upgrades.
- Provider-configuration changes go through the same PR process as code.
- Agents/skills are pruned by pilot evidence, not accumulated.
- Benchmarks (Phase 8 scenario pack) are re-run after significant prompt,
  agent, or provider changes.
- A new provider is added by mapping the neutral contracts to its native
  mechanisms — never by adding a runtime.
