# Agentic SDLC — Current-State Audit

Date: 2026-07-11
Phase: 0 (Current-State Audit and Target Design)
Status: Baseline for Phases 1-10

## 0. Audit baseline

Per Maintainer decision, this audit describes the repository **working tree as it
exists on disk**, not the last commit. The working tree on `main` (HEAD `acb27fc`)
carries a large uncommitted, unstaged restructure of about 205 changes:

- All `.agentquilt/meta-agents/**` sources (44 agents in 5 category directories) and
  `.agentquilt/skills/new-agent/` deleted.
- All `.agentquilt/agents/project/` fragments (the source of `AGENTS.md` and
  `CLAUDE.md`) and `.agentquilt/agents/_shared/` deleted.
- 45 new untracked flattened agent directories at `.agentquilt/agents/<name>/`,
  including a newly adopted `test-runner` (previously a hand-authored, unmanaged
  `.claude/agents/test-runner.md`).
- `.agentquilt/config.yaml` rewritten from eight targets down to a single wildcard
  `agent-definitions` target for the `claude` platform.
- CLI changes in `packages/agentquilt-cli/`: `check.ts` now verifies
  agent-definitions outputs byte-for-byte against freshly compiled content;
  `package.json` gains npm keywords; new e2e tests.
- Generated files (`agentquilt.lock`, four `.claude/agents/*.md`) modified
  accordingly.

The shape of the restructure (flattened directories, manifest descriptions like
"Meta-agent for sdlc workflow - code-review", fragment names derived from body
headings such as `030-test-security-test-ts.md`) matches the behavior of
`agentquilt init` adoption mode as fixed in v0.1.1 ("split multi-section bodies
into numbered fragment files on adoption", commit `d5bc25b`). The restructure is
therefore best read as: the compiled `.claude/agents/*.md` outputs were re-adopted
as the canonical sources, replacing the previous categorized meta-agent tree.

WARNING — audit findings about the baseline itself:

1. **The baseline is not committed.** ~205 changes exist only in the working tree.
   Any `git checkout`/`reset`/`stash` would destroy the de-facto current state.
   Phase 1 must land (commit) or explicitly disposition this restructure before
   any cleanup work.
2. **The working tree fails its own drift check.** `node
   packages/agentquilt-cli/dist/index.js check` exits 1: `.claude/agents/
   agent-registry.md` on disk contains manual tamper strings ("Agent ss",
   "stepsdfvdfv") not present in its source — evidently left over from manually
   testing the new output-drift detection in `check.ts`. All other 45 outputs and
   `agentquilt.lock` match. A rebuild fixes it.
3. **Adoption was lossy.** Original meta-agent identity (category, curated
   fragment names, `name:` fields) was flattened; three sources absorbed formatting
   artifacts (extra blank lines inside fenced blocks in `eval-designer`,
   `security-review`). Original content remains recoverable from HEAD.

Test suite status on this tree: 264/264 tests pass (`npm test` in
`packages/agentquilt-cli`).

## 1. Current architecture

- **Monorepo**: npm workspaces (`package.json` root, `workspaces: ["packages/*"]`).
  - `packages/agentquilt-cli/` — the product: TypeScript CLI (`agentquilt`,
    v0.1.1, published to npm). Commander.js, Zod, `yaml`; built with `tsc`;
    tested with Vitest (20 test files, 264 tests, golden-file fixtures under
    `tests/fixtures/`).
  - `packages/website/` — Astro site deployed to Vercel (`vercel.json`,
    agentquilt.dev). Not part of the SDLC pipeline.
- **Language-neutral schemas**: `schemas/*.schema.json` (agent manifest,
  instruction block, eval case, gate policy).
- **Product model**: fragments under `.agentquilt/` compile deterministically to
  provider outputs (Claude agents today; AgentSkills adapter exists; Codex adapter
  deferred). Lock file `agentquilt.lock` records a version matrix;
  `agentquilt check` is the CI drift gate.
- **Self-hosting**: the repo uses AgentQuilt to manage its own agent definitions
  (46 agents compiled to `.claude/agents/*.md`).

### Canonical vs. generated paths (working tree)

| Path | Kind | Notes |
| ---- | ---- | ----- |
| `.agentquilt/config.yaml` | Canonical | Single wildcard `agent-definitions` target, platform `claude` |
| `.agentquilt/agents/<name>/` (46 dirs) | Canonical | `agent.yaml` + numbered fragments; all agents incl. `test-runner` now managed |
| `.claude/agents/*.md` (46 files) | **Generated** | Compiled by `agentquilt build`; one file (`agent-registry.md`) currently tampered/drifted |
| `agentquilt.lock` | **Generated** | Version matrix; matches sources |
| `AGENTS.md` | **Generated — ORPHANED** | Source fragments (`agents/project/`) deleted; target removed from config; content stale |
| `CLAUDE.md` | **Generated — ORPHANED** | Same as `AGENTS.md`; still read by Claude Code as project instructions |
| `.agents/skills/new-agent/SKILL.md` | **Generated — ORPHANED** | Source (`.agentquilt/skills/new-agent/`) deleted; target removed from config |
| `.claude/settings.json` | Canonical (hand-authored) | Enables the GitHub plugin only; no permissions, no hooks |
| `.claude/settings.local.json` | Local, untracked | Personal permission allowlist |
| `policies/`, `schemas/`, `.docs/`, `.github/` | Canonical | Hand-authored |
| `packages/agentquilt-cli/dist/` | Generated, gitignored | Build output |
| `.planning/` | Local, gitignored | Includes the agentic-sdlc phase docs |

"Orphaned" means: the file exists on disk and is tracked, but the working tree has
neither source fragments nor a config target that can regenerate it. `agentquilt
check` no longer covers these files (their targets are gone), so their staleness
is invisible to CI.

## 2. Current SDLC flow

Documented process (all hand-authored, largely aspirational for a single-maintainer
project):

- `.docs/sdlc/lifecycle.md` — 7 stages (Intake, Requirements, Architecture,
  Implementation, Verification, Release, Post-release review).
- `.docs/sdlc/gates.md` — gates G0-G6 mapped to the stages.
- `policies/gates/*.yaml` — 5 machine-readable gate policies (intake, requirement,
  architecture, pr-quality, release) with `aiAssistance` blocks naming agents
  (e.g. `code-review-agent`) that were designed for the now-abandoned automated
  invocation path.
- `policies/risks/risk-register.yaml` — risk register with AI-assistance notes.
- `.docs/sdlc/governance.md` + ADR-0004 — authority model: agents draft and
  recommend; humans approve, merge, and release. This is the load-bearing
  precedent for the agentic SDLC's human-gate design.
- `.docs/sdlc/branching-strategy.md`, `CONTRIBUTING.md` — branch naming
  (`feature/…`, `fix/…`, `agent/…`), commit format `<type>(<scope>): <summary>`,
  PR expectations, ADR policy.
- `.docs/sdlc/release-process.md` — manual release: checklist (tests, typecheck,
  drift check, CHANGELOG, version bump, risk register), then `npm version` /
  `git push --tags` / `npm publish`. No release automation performs publication.
- `CODEOWNERS` — placeholder team names (`@core-maintainers` etc.); no GitHub org
  exists yet.

De-facto flow: single maintainer works with Claude Code interactively; PRs are
opened and merged by the maintainer; CI (below) gates on deterministic checks;
agent involvement is manual, per `.docs/CLAUDE_CODE_ONLY_AGENTS.md`.

### Authoritative commands (from repository evidence)

From `package.json` (root and `packages/agentquilt-cli/`) and
`.github/workflows/*.yml`:

| Command | Where defined | Purpose |
| ------- | ------------- | ------- |
| `npm install` | root | Install workspace deps |
| `npm run build` | root → `-w packages/agentquilt-cli` | `tsc` build of the CLI |
| `npm test` | root → `-w packages/agentquilt-cli` | `vitest run` (264 tests) |
| `npm run coverage` | CLI package | `vitest run --coverage` (CI enforces thresholds: 75% lines / 65% branches per pr-quality-gate.yaml) |
| `npm run lint` | CLI package | `eslint src --ext .ts` (NOT run in CI) |
| `npm run format` | CLI package | `prettier --write src tests` (not in CI) |
| `npx tsc --project tsconfig.test.json` | CI workflows | Typecheck incl. tests |
| `node packages/agentquilt-cli/dist/index.js check` | CI workflows | Drift check (exit 1 = drift, 2 = config error, 3 = I/O) |
| `npx agentquilt build` | docs, CONTRIBUTING flow | Regenerate outputs + lock |
| `npm version <type>` / `npm publish` | release.yml comment, release-process.md | Manual release steps |

## 3. Current Claude assets

- `CLAUDE.md` (root) — Claude Code project instructions. **Stale and orphaned**:
  describes `.agentquilt/meta-agents/` and `.agentquilt/skills/` (deleted),
  "45 managed outputs + unmanaged test-runner" (now 46 managed), the `new-agent`
  skill workflow (source deleted), and Phase 3.x API-integration status. It is
  still loaded by Claude Code on every session, so it actively misleads agents.
- `.claude/agents/*.md` — 46 compiled agent definitions (see inventory, section 6).
  All carry `tools: Read, Grep, Glob` (from `permissions: read-only` in every
  manifest) — no agent can execute commands or edit files.
- `.claude/settings.json` — enables `github@claude-plugins-official` plugin.
  **No permission rules, no hooks, no skills, no commands** are defined at the
  project level. `.claude/skills/` does not exist.
- `.claude/agent-memory/`, `.claude/worktrees/`, `scheduled_tasks.lock`,
  `settings.local.json` — local runtime state, untracked.

Provider-native features already used: project instructions (CLAUDE.md), project
agents (.claude/agents), one plugin. Not used: skills, commands, hooks, permission
rules, output styles, managed subagent teams.

## 4. Current Codex assets

None, confirmed from the tree:

- No `.codex/` directory.
- No Codex adapter in the CLI (deferred per CLAUDE.md and v1.1 addendum §6.2-6.3).
- `AGENTS.md` exists at root (Codex/vendor-neutral instruction file) but is the
  stale orphaned artifact described above.
- `.agents/skills/new-agent/SKILL.md` exists (vendor-neutral Agent Skills format,
  usable by Codex in principle) but is orphaned.

## 5. Current GitHub automation

Four workflows in `.github/workflows/`, all deterministic — **no workflow calls a
model API** (the Claude Code-Only Simplification already removed automated
invocation; `.github/actions/invoke-agent/` no longer exists):

| Workflow | Trigger | Behavior |
| -------- | ------- | -------- |
| `test.yml` | PR + push to main | npm ci, typecheck, tests, coverage, build, drift check |
| `pr-review.yml` | PR opened/synchronize | Same checks as test.yml, then posts a comment recommending manual Claude Code review agents ("Agents advise; maintainer approves") |
| `intake.yml` | Issue opened | github-script field validation (problem/owner/risk regex), posts triage reminder recommending the product-discovery agent; links `.docs/PHASE_3_COMPLETION.md` |
| `release.yml` | Manual dispatch | Checks + echoed "release readiness report" with hardcoded OK lines (e.g. risk-register check is an `echo`, not a real check); posts a checklist comment to hardcoded issue #1 |

Issue templates (`.github/ISSUE_TEMPLATE/`): `agent_change.md`,
`feature_request.md` — plain Markdown templates, not YAML issue forms. **No bug
template**, no refactoring/documentation/release-task templates, no structured
risk/acceptance-criteria fields matching the intake gate.

PR template (`.github/pull_request_template.md`): change type, risk level,
affected areas, validation checklist, agent impact. Missing (vs. Phase 7
requirements): linked issue, task classification, approved plan/rationale,
tests-executed evidence, generated-output changes, fixture explanation, review
findings and resolution, limitations, follow-up work.

CI gaps: no lint step, no secret scanning, no dependency checks, no package
validation (`npm pack` dry run).

## 6. Agent inventory (46 agents, working tree)

All 46 are compiler-managed (`.agentquilt/agents/<name>/` → `.claude/agents/
<name>.md`), all `model: balanced` (except `test-runner`: sonnet via manifest
model), all `permissions: read-only` → `tools: Read, Grep, Glob`.

Content quality is measurable from fragment structure: most agents pair a short
`010-role.md` (a one-line purpose plus a copy-pasted ADR-0004 authority
boilerplate block) with a **byte-identical category workflow fragment** shared
across the whole former category:

- `020-stlc-workflow.md`: identical across 7 agents
- `020-sdlc-workflow.md`: identical across 3 agents
- `020-governance-workflow.md`: identical across 5 agents
- `020-release-workflow.md`: identical across 6 agents
- `020-internal-coordination-workflow.md`: identical across 10 agents

### Substantive agents (useful instructions worth preserving)

| Agent | Lines | Assessment |
| ----- | ----- | ---------- |
| eval-designer | 190 | Real eval workflow with static/mock eval examples |
| test-runner | 188 | Real test-execution workflow (adopted from hand-authored file) — but now read-only, so it **cannot run tests**; adoption also dropped `memory: project` and narrowed tools |
| security-review | 147 | Real threat assessment content; fragments 030-060 are adoption split artifacts (named after body headings) |
| risk-register | 118 | Real risk classification workflow |
| code-review | 103 | Specific review priorities, example comments, repo-specific security concerns |
| reviewer | 39 | Original demo/user agent; generic but coherent; overlaps code-review |

### Thin but role-specific (salvageable seeds, 15-25 lines each)

adr-writer, ambiguity-detector, architecture, requirements-analyst, schema-design,
golden-file-test, semantic-regression, secret-leakage-detection, product-discovery.
Each has a specific checklist or pattern list but no real workflow.

### Stubs (boilerplate role + shared category fragment)

- Former SDLC: developer-experience, documentation, implementation-planning
- Former STLC: compatibility-test, defect-triage, performance-test, qa-strategy,
  regression-scope, test-automation, test-design
- Former governance: gatekeeper, policy-compliance, prompt-injection-test,
  supply-chain-risk, traceability
- Former release: changelog, evidence-collector, migration-guide,
  post-release-review, release-manager, versioning
- Former internal: agent-behavior-reviewer, agent-documentation, agent-migration,
  agent-registry, conflict-detector, definition-architect,
  instruction-block-author, instruction-refactoring, main-orchestrator,
  prompt-compiler-guardian

### Reconciliation against the 8 required development roles

The master prompt requires: repository analyst, implementation planner, feature
implementer, test engineer, architecture reviewer, regression reviewer,
documentation reviewer, release reviewer. Recommendation is **reuse-vs-replace**
per role (final disposition is Phase 3 work, gated):

| Required role | Existing material | Recommendation |
| ------------- | ----------------- | -------------- |
| Repository analyst | product-discovery (thin), requirements-analyst (thin) | Replace: new read-only analyst; fold intake/requirements checklists in |
| Implementation planner | implementation-planning (stub) | Replace: rewrite from scratch; keep the stage-integration map as reference |
| Feature implementer | **none** (every agent is read-only) | New: the portfolio has no write-capable role at all |
| Test engineer | test-runner (substantive), test-automation, test-design (stubs) | Reuse test-runner content; must gain execution permission; merge the two stubs |
| Architecture reviewer | architecture (thin), adr-writer (thin), schema-design (thin) | Reuse-merge: one reviewer; adr-writer and schema-design content folded in or kept as specialists |
| Regression reviewer | regression-scope, semantic-regression, golden-file-test (thin/stubs) | Replace-merge into one regression/generated-output reviewer |
| Documentation reviewer | documentation, agent-documentation (stubs) | Replace |
| Release reviewer | release-manager, versioning, changelog, evidence-collector, post-release-review, migration-guide (6 overlapping stubs) | Replace-merge into one release reviewer (never publishes/tags); changelog/migration content as checklists |

Conditional specialists with existing usable seeds: security-review,
eval-designer, code-review (merge with `reviewer`), compatibility-test,
supply-chain-risk, developer-experience, ambiguity-detector, performance-test,
prompt-injection-test and secret-leakage-detection (fold into security scenarios).

Candidates for retirement (duties belong to the compiler, CI, skills, or humans;
or the concept implies a custom runtime): main-orchestrator (explicit
orchestration concept — banned by the master prompt), agent-registry (also the
tampered file), conflict-detector, definition-architect, instruction-block-author,
instruction-refactoring, agent-behavior-reviewer, agent-migration,
prompt-compiler-guardian, gatekeeper, policy-compliance, traceability,
defect-triage, qa-strategy.

Net effect: 46 agents → roughly 8 core + 8-10 specialists. The count must be
driven by responsibility (Phase 3 acceptance criterion), and no parallel
overlapping set may be created.

## 7. Obsolete components (explicit API-integration surface)

The master prompt requires the obsolete API-driven invocation surface to be
identified explicitly. From repository evidence:

**Executable code and dependencies (Phase 1 removal candidates):**

- `packages/agentquilt-cli/src/integration/claude-agent.ts` (372 lines) — imports
  `@anthropic-ai/sdk`; RateLimiter, retry/backoff, JSON invocation logging,
  `invokeAgent()`, `loadAgentDefinition()`, `parseAgentResponse()`,
  `parseFinding()`. Nothing else in `src/` imports it; it is dead code inside the
  published product package.
- `packages/agentquilt-cli/tests/claude-agent.test.ts` (712 lines) — its test
  suite (runs in every CI pass today).
- `@anthropic-ai/sdk` devDependency in `packages/agentquilt-cli/package.json` —
  exists solely for the above.
- `.github/actions/invoke-agent/` — already removed (verified absent).

**Documentation claiming or describing API-driven invocation (stale or
historical-only):**

- `.docs/PHASE_3_1_COMPLETION.md`, `.docs/PHASE_3_3_COMPLETION.md`,
  `.docs/PHASE_3_COMPLETION.md` — completion reports for the API-integration
  phases.
- `.docs/ENVIRONMENT_SETUP.md` — ANTHROPIC_API_KEY secrets, cost monitoring, rate
  limiting setup for GitHub Actions invocation.
- `.docs/integration/agent-invocation.md` — describes workflows invoking agents
  via the API layer ("What needs implementation — Claude API integration layer").
- `.docs/integration/phase3-timeline.md`.
- `.docs/CLAUDE_CODE_ONLY_AGENTS.md` — documents the pivot away from API
  invocation; historical value, but framed as "current approach" doc.
- `.docs/SDLC_STLC_REVIEW_SUMMARY.md`, `.docs/TEST_AGENT_CODE_REVIEW.md` —
  review-session records referencing the API era.
- `CLAUDE.md` / `AGENTS.md` "Current Phase" sections — describe Phases 3.1-3.3
  and the integration library as completed assets.

**Workflow and policy remnants:**

- `intake.yml` comment links `.docs/PHASE_3_COMPLETION.md`.
- `policies/gates/*.yaml` `aiAssistance` blocks name agents (e.g.
  `code-review-agent`) and task automation designed for the API path.
- `release.yml` fake checks (`echo "OK: No blocking risks found"`) present
  automation theater rather than real gating.

**Orphaned generated artifacts (disposition needed, Phase 1 gate):**

- `AGENTS.md`, `CLAUDE.md` — tracked, stale, sources deleted, targets removed.
- `.agents/skills/new-agent/SKILL.md` — tracked, source deleted, target removed.

## 8. Gaps (issue-to-PR lifecycle)

1. **No regenerable project instructions.** CLAUDE.md/AGENTS.md cannot be rebuilt;
   their content misstates the repository. Every agent session starts from wrong
   context. (Largest single defect found.)
2. **No write-capable agent role** — the current portfolio cannot implement
   anything; there is no implementer, and the test agent cannot execute tests.
3. **No workflow definitions**: no Claude skills/commands for analyze-issue,
   plan-change, develop-issue, review-tree, fix-CI, prepare-PR,
   release-readiness. The lifecycle exists only as prose in `.docs/sdlc/`.
4. **No role contracts**: agents lack triggers, inputs, outputs, handoffs,
   prohibited actions, completion criteria.
5. **No provider guardrails**: no permission rules, no hooks; nothing prevents an
   agent from hand-editing generated files, adding dependencies, or running
   destructive git commands other than instruction text.
6. **No Codex pipeline at all** (expected; Phase 5).
7. **Issue intake is thin**: two Markdown templates, no bug form, no structured
   fields; intake.yml validates by regex against free text.
8. **PR evidence is thin**: template collects checkboxes, not plan/evidence/
   review findings; no linked-issue requirement.
9. **CI gaps**: no lint, no secret scanning, no dependency audit, no package
   validation; release.yml contains placeholder checks; drift check only just
   gained agent-output verification (uncommitted).
10. **Docs drift**: sdlc/stlc/policy docs and CLAUDE.md describe a 44-meta-agent,
    5-category, API-capable world that no longer exists.

## 9. Risks

| # | Risk | Severity | Phase to address |
| - | ---- | -------- | ---------------- |
| R1 | Uncommitted ~205-change baseline could be lost or half-committed; git history cannot explain the current state | High | 1 (first action: land or disposition the restructure) |
| R2 | `agentquilt check` fails on the working tree (tampered `agent-registry.md`); committing as-is would break CI | High | 1 (rebuild) |
| R3 | Stale CLAUDE.md/AGENTS.md actively mislead every AI session in the repo | High | 1-2 |
| R4 | Lossy adoption erased curated meta-agent identity; original content only in HEAD, which the restructure deletes on commit | Medium | 1 (archive mapping before/at commit), 3 |
| R5 | `test-runner` silently changed semantics (tools narrowed to read-only, `memory: project` dropped) during adoption | Medium | 3 |
| R6 | All-read-only portfolio plus "main-orchestrator" concept invite building a custom runtime to compensate — banned by the master prompt | Medium | 3-4 |
| R7 | Dead API-integration code ships inside the published npm package source tree | Medium | 1 |
| R8 | Gate policies and workflows reference nonexistent automation, eroding trust in gates | Medium | 1, 7 |
| R9 | Single maintainer: "human approval" gates are self-approvals; process must stay lightweight or it will be bypassed | Medium | 2, 10 |
| R10 | CODEOWNERS placeholder teams make ownership rules unenforceable | Low | 7 |
| R11 | Coverage thresholds live only in a gate-policy YAML; CI and policy can drift | Low | 7 |

## 10. Proposed final directory structures

Target state after Phase 10 (details in
[target-operating-model.md](target-operating-model.md); the dogfooding open
question below affects whether `.claude/agents/` stays compiler-managed):

```
repo/
├── .agentquilt/
│   ├── config.yaml                  # targets: agent-definitions (claude) [+ project guide if restored]
│   └── agents/
│       ├── _shared/                 # shared fragments (authority model, repo conventions)
│       ├── project/                 # RESTORED: source of AGENTS.md + CLAUDE.md (open question)
│       ├── <core-role>/             # 8 core lifecycle agents (analyst, planner, implementer,
│       │                            #   test-engineer, arch/regression/docs/release reviewers)
│       └── <specialist>/            # 8-10 conditional specialists
├── .claude/
│   ├── agents/                      # generated (or hand-authored — open question)
│   ├── skills/                      # hand-authored dev workflows: analyze-issue, plan-change,
│   │                                #   develop-issue, implement-task, review-tree, fix-ci,
│   │                                #   prepare-pr, release-readiness
│   └── settings.json                # permissions + hooks (guardrails, Phase 6)
├── .codex/
│   ├── config.toml                  # hand-authored (Phase 5; explicitly NOT via a new adapter)
│   └── agents/*.toml                # hand-authored Codex role agents
├── .agents/skills/                  # vendor-neutral skills shared with Codex
├── AGENTS.md                        # regenerated (or hand-maintained) — never stale
├── CLAUDE.md                        # regenerated (or hand-maintained) — never stale
├── .docs/
│   ├── agentic-sdlc/                # this audit + operating model + backlog + Phase 2 contracts
│   ├── archive/                     # explicitly non-current historical docs (Phase 3.x era)
│   └── (sdlc/, stlc/, architecture/ updated to match reality)
├── .github/
│   ├── ISSUE_TEMPLATE/*.yml         # issue forms: bug, feature, refactor, docs, compat, release
│   ├── pull_request_template.md     # evidence-carrying template
│   └── workflows/                   # deterministic only; no model calls
├── policies/                        # gates updated to describe manual provider-CLI assistance
└── packages/agentquilt-cli/         # product; integration/ directory removed
```

## 11. Phase-by-phase migration map

| Phase | Title | What moves/changes (from this audit) |
| ----- | ----- | ------------------------------------ |
| 1 | Boundary Cleanup and Legacy Removal | GATED. Land/disposition the uncommitted restructure (R1); rebuild tampered output (R2); remove `integration/claude-agent.ts`, its test, `@anthropic-ai/sdk`; archive Phase 3.x docs under an explicit historical location; fix intake.yml doc link and release.yml placeholder checks or defer to Phase 7; decide orphaned AGENTS.md/CLAUDE.md/SKILL.md disposition (restore sources vs. hand-author — see open questions); scrub gate-policy aiAssistance blocks of API-era claims |
| 2 | Shared Agentic SDLC Contract | Write `.docs/agentic-sdlc/` contracts (lifecycle, classification, risk/approval, investigation, plan, review, validation, handoff, completion); supersedes-and-reconciles `.docs/sdlc/lifecycle.md` + `gates.md` content for development work; three profiles (small/standard/high-risk) |
| 3 | Agent Portfolio Rationalization | GATED (generated-output semantics). 46 → ~8 core + specialists per section 6 table; retire main-orchestrator et al. with documented mapping; add role contracts; restore test-runner execution capability; edit `.agentquilt/` sources and rebuild |
| 4 | Claude Code Pipeline | Add `.claude/skills/` workflows, wire core agents, settings/permissions; develop-issue loop with human pause points; validate on representative tasks |
| 5 | Codex Pipeline | Create `.codex/config.toml`, `.codex/agents/*.toml`, repo-scoped skills; hand-authored — no AgentQuilt Codex adapter for this SDLC; regenerated/maintained AGENTS.md as Codex entry point |
| 6 | Guardrails, Permissions, Hooks | Permission rules + hooks enforcing: no generated-file edits, no unapproved deps, no destructive git, no publish/tag, drift detection before completion; same policy outcome on both providers |
| 7 | GitHub and Deterministic CI | Issue forms (add bug/refactor/docs/compat/release), evidence-carrying PR template, CI additions (lint, secret scan, dependency check, package validation), fix release.yml placeholders, CODEOWNERS realism; CI stays model-free |
| 8 | Evaluations and Benchmarks | Scenario pack exercising the audit's risk areas (generated-file edit attempt, schema change, fixture change, prompt injection); run via provider CLIs manually; no live calls in CI |
| 9 | Multi-Agent Parallelism | Only after 4-8 stable; parallel read-only analysis; worktree isolation for independent writes |
| 10 | Pilot, Tuning, Operating Model | Real-work pilot incl. one release; prune agents/hooks by evidence; final operating-model doc; maintenance cadence |

## 12. Open questions (recorded, not decided here)

1. **Dogfooding vs. hand-authored provider agents.** Should development agents
   remain compiled by AgentQuilt (managed `.claude/agents/` outputs, as today) or
   become hand-authored native `.claude/` files? Working-tree evidence favors
   dogfooding: the restructure re-adopted every agent (including the previously
   unmanaged test-runner) into compiler management and extended `agentquilt
   check` to verify agent outputs — the maintainer is investing in the managed
   path. Costs observed: adoption was lossy, per-agent `x-claude` extension
   support for richer frontmatter (memory, hooks) may lag provider features, and
   Claude skills/hooks/settings have no compiler representation and will be
   hand-authored either way. The master prompt bans NEW product code for the
   pipeline; dogfooding the existing compiler adds none.
2. **Disposition of the orphaned project guide.** Restore
   `.agentquilt/agents/project/` fragments (updated) plus the AGENTS.md/CLAUDE.md
   targets, or hand-author CLAUDE.md/AGENTS.md going forward? Follows partly from
   question 1; must be decided at the Phase 1 gate before any deletion or rewrite.
3. **Fate of `.agents/skills/new-agent/SKILL.md`.** Restore its source, or retire
   the skill (its workflow references deleted config structures).
