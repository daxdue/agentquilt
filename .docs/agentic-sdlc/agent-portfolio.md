# Agentic SDLC — Development-Agent Portfolio

Date: 2026-07-12
Status: Active (Phase 3 deliverable; approved by the Maintainer at the
portfolio-restructure gate on 2026-07-12 — decisions D1-D6 recorded in
section 10 — and executed in Phase 3 segment 2). This document is the
durable reference for the development-agent portfolio.
Companion documents: [target-operating-model.md](target-operating-model.md)
(8-role model), [lifecycle.md](lifecycle.md) (stage catalog and per-stage
roles), [current-state-audit.md](current-state-audit.md) section 6 (the
pre-rationalization inventory), [restructure-mapping.md](restructure-mapping.md)
(pre/post restructure correspondence, reachable history at `acb27fc`).

## 1. Purpose and scope

This document rationalizes the 46 compiler-managed development agents under
`.agentquilt/agents/<name>/` into a deliberate development team: 8 core
lifecycle roles plus 6 conditional specialists (14 agents total). It records,
for every existing agent, its verified current state, its disposition, and
the mapping rationale, so no useful history is lost undocumented. It then
defines the role contract for every retained agent and the concrete source
changes segment 2 performs.

Binding constraints:

- Development infrastructure only; no AgentQuilt product features and no
  compiler changes. Everything below is expressible with the existing
  manifest format and Claude adapter (section 8).
- Development agents stay compiled by AgentQuilt (Maintainer decision,
  2026-07-11): canonical sources under `.agentquilt/agents/<name>/`, compiled
  to `.claude/agents/*.md`, drift-checked by `agentquilt check`. Sources are
  edited and outputs rebuilt; generated files are never hand-edited.
- No orchestrator runtime and no orchestrator agent. Sequencing lives in the
  human provider-CLI session and, later, in Phase 4/5 skills.
- All retired content remains recoverable from git (`acb27fc` for the
  pre-restructure layout; the pre-rationalization sources at the commit
  preceding the segment 2 changes).

## 2. Target portfolio summary

Core lifecycle roles (one accountable primary per stage; stage codes from
[lifecycle.md section 3](lifecycle.md#3-stage-catalog)):

| Agent | Access | Primary stages |
| ----- | ------ | -------------- |
| repository-analyst | read-only (+ read-only git via Bash, see D2) | INV |
| implementation-planner | read-only | CLS, PLN |
| feature-implementer | write (workspace) | IMP, COR (fixes), PRP (assembly) |
| test-engineer | write (test code) + execute | VER, VAL |
| architecture-reviewer | read-only | REV |
| regression-reviewer | read-only + execute deterministic checks | RGR |
| documentation-reviewer | read-only | DOC |
| release-reviewer | read-only | REL |

APP (human approval checkpoint) is owned by the Maintainer; no agent is
primary for it, by design (ADR-0004).

Conditional specialists (trigger only when relevant; all engage as specialist
reviewers or advisors, never as stage owners):

| Agent | Specialty | Source |
| ----- | --------- | ------ |
| security-review | input validation, path resolution, YAML parsing, secrets, injection | retained (substantive), refined |
| schema-design | schemas, persisted formats, JSON Schema / Zod parity | retained (seed), refined |
| deterministic-output | normalization, hashing, ordering, golden-file discipline | new (from golden-file-test seed) |
| eval-designer | behavioral evals, semantic shifts in compiled prompts | retained (substantive), refined |
| supply-chain-risk | dependency and supply-chain risk | retained (stub), rewritten |
| ambiguity-detector | requirements ambiguity, testable acceptance criteria | retained (seed), refined |

Specialists proposed for retirement rather than retention, honestly flagged
(phase doc names them as candidates, but no real trigger or workflow can be
written today — see section 3.4): performance, developer experience,
migration, compatibility (as a separate agent). Each is recoverable from git
and can be recreated when a real need appears.

## 3. Agent inventory and disposition (all 46)

Current state verified against the sources on 2026-07-12 (line counts of all
`.md` fragments per agent; byte-identity of shared category fragments
confirmed via checksums: `020-stlc-workflow.md` identical across 7 agents,
`020-sdlc-workflow.md` across 3, `020-governance-workflow.md` across 5,
`020-release-workflow.md` across 6, `020-internal-coordination-workflow.md`
across 10). The audit section 6 classification is confirmed: 6 substantive,
9 thin seeds, 31 stubs.

Unmanaged files check: `.claude/agents/` contains exactly the 46 compiled
outputs of the managed sources and nothing else. No unmanaged
`claude-code-guide.md` (or any other hand-authored file) exists in the repo;
the `claude-code-guide` agent visible in Claude Code sessions is a built-in
of the tool, not a repository asset. No action needed.

Retirement categories (phase doc): DUP duplicate, EMPTY empty scaffold,
SKILL duties belong in a skill, AUTH excessive authority, ORCH orchestrator
concept, BROAD too broad to evaluate.

### 3.1 Substantive agents (6)

| Agent | Lines | State | Disposition | Rationale / mapping |
| ----- | ----- | ----- | ----------- | ------------------- |
| eval-designer | 190 | substantive | Retain as specialist (refined) | Real static/mock eval workflow; core domain for a prompt compiler. 010-role rewritten to the role contract; 020-040 workflow/example fragments kept. Absorbs semantic-regression's compiled-prompt semantic-shift detection. |
| test-runner | 188 | substantive | Merge into test-engineer (core) | The only real test-execution workflow in the portfolio, but currently read-only and therefore unable to run tests (audit risk R5). Its 010-role content seeds the test-engineer body; execution permission restored via manifest. Directory retired after content reuse. |
| security-review | 147 | substantive | Retain as specialist (refined) | Real threat assessment with repo-specific payloads. 010-role rewritten to the role contract; threat-assessment fragments consolidated. Absorbs secret-leakage-detection (pattern list) and prompt-injection-test (compiled-prompt injection scenarios). |
| risk-register | 118 | substantive | Retire (see decision D3) | Real classification content, but ownership is now defined without it: plans flag risks (PLN), the Maintainer owns the register ([risk-and-approval-policy section 7](risk-and-approval-policy.md#7-risk-register)), and the release reviewer checks register status at REL. A standing register-maintenance agent duplicates those owners (DUP with PLN/REL duties). Classification table recoverable from git if a register-focused workflow returns. |
| code-review | 103 | substantive | Merge into architecture-reviewer (core) | Review checklist, priorities, and example comments seed the architecture-reviewer's code-correctness section. Keeping a second reviewer agent would give REV two owners (DUP; violates one-owner acceptance criterion). See decision D4. |
| reviewer | 39 | substantive (generic) | Merge into architecture-reviewer (core) | The original demo agent; coherent but generic and fully overlapped by code-review (DUP). Review-criteria content folded into the same reviewer body. |

### 3.2 Thin role-specific seeds (9)

| Agent | Lines | Disposition | Rationale / mapping |
| ----- | ----- | ----------- | ------------------- |
| adr-writer | 22 | Merge into architecture-reviewer | ADR-necessity check and structure checklist are REV duties per the operating model ("ADR necessity"). The reviewer may draft an ADR skeleton for human refinement; it never finalizes. |
| ambiguity-detector | 24 | Retain as specialist (refined) | Real pattern list and concrete-phrasing examples; real trigger (vague acceptance criteria at CLS/INV). Absorbs requirements-analyst's testability checklist. |
| architecture | 15 | Merge into architecture-reviewer | Its checklist (compat, security impact, testing strategy, alternatives, ADR trigger) is the design-conformance section of the new reviewer. |
| requirements-analyst | 15 | Merge into ambiguity-detector; retire directory | Testability/traceability checklist folded into the requirements-ambiguity specialist. Intake-side validation moves upstream to Phase 7 issue forms. |
| schema-design | 17 | Retain as specialist (refined) | Real trigger (schemas, Zod, manifest/lock format = persisted-format gate) and a real review workflow (breaking changes, defaults, validation completeness, up/down compatibility). |
| golden-file-test | 21 | Split: workflow into regression-reviewer and deterministic-output; retire directory | Running golden tests on a diff is RGR (regression reviewer). Reviewing changes to determinism guarantees themselves is the deterministic-output specialist. Single-purpose test-runner duty does not need its own agent (SKILL: it is one command). |
| semantic-regression | 21 | Merge into eval-designer | Semantic comparison of compiled prompts is eval work; the examples move into the eval-designer body. |
| secret-leakage-detection | 25 | Merge into security-review | Pattern list becomes a section of the security specialist; a standalone grep-pattern agent is skill-material (SKILL). |
| product-discovery | 25 | Retire | Issue triage is upstream of the development lifecycle (G0 intake; lifecycle section 6) and becomes Phase 7 issue-form structure plus human triage. No stage in the lifecycle routes to it (its trigger, "on issue open", presumed the retired automation). |

### 3.3 Stubs (31; boilerplate role fragment + shared category fragment)

Former SDLC (3):

| Agent | Disposition | Rationale / mapping |
| ----- | ----------- | ------------------- |
| implementation-planning | Replace with implementation-planner (core) | EMPTY. Purpose line ("create implementation roadmaps and task breakdowns") is the planner role; nothing else worth carrying. |
| documentation | Replace with documentation-reviewer (core) | EMPTY. DOC stage needs a reviewer with the fragment-currency check, not a doc generator. |
| developer-experience | Retire | EMPTY, and no honest trigger: "improve ergonomics" has no entry criterion, no input artifact, no completion criterion (BROAD). Recreate if a DX review workflow with a real trigger emerges. |

Former STLC (7):

| Agent | Disposition | Rationale / mapping |
| ----- | ----------- | ------------------- |
| test-design | Merge duties into test-engineer | EMPTY. "Design test cases for new features" is the test engineer's coverage duty (operating model: "add missing coverage for changed code"). |
| test-automation | Merge duties into test-engineer | EMPTY. Test-code generation and fixture maintenance are the same role. |
| regression-scope | Merge duties into regression-reviewer | EMPTY. "Define regression scope per change" is the RGR entry step. |
| compatibility-test | Merge duties into regression-reviewer | EMPTY. Lifecycle RGR already owns "public CLI behavior and exit-code compatibility"; a separate compatibility agent would create a second owner of the same decision (DUP). Flagged as a deliberate deviation from the phase doc specialist list — see section 3.4. |
| qa-strategy | Retire | EMPTY + BROAD. QA strategy is a document (`.docs/stlc/test-strategy.md`), not a recurring agent task; no trigger can be written. |
| defect-triage | Retire | EMPTY. Failure classification happens inside VER reporting and the COR loop; no separate decision to own. |
| performance-test | Retire | EMPTY, and no perf benchmark infrastructure exists in the repo to execute against; a perf agent without benchmarks is completeness theatre. Recreate when benchmarks exist. |

Former governance (5):

| Agent | Disposition | Rationale / mapping |
| ----- | ----------- | ------------------- |
| gatekeeper | Retire | AUTH: "gate policy enforcement and audit" — enforcement belongs to deterministic CI and the Maintainer; an enforcing agent contradicts ADR-0004. |
| policy-compliance | Retire | DUP: policy verification is the review-contract checklist ([review-contract section 4](review-contract.md#4-agentquilt-specific-review-checklist)) executed by every reviewer. |
| prompt-injection-test | Merge into security-review | Injection scenarios for compiled prompts become a security-review section. |
| supply-chain-risk | Retain as specialist (rewritten) | The trigger is real and load-bearing: the new-dependency approval gate ([risk-and-approval-policy section 3](risk-and-approval-policy.md#3-approval-gate-triggers)). Gets a real workflow (section 6.13). |
| traceability | Retire | DUP: requirement-to-evidence linkage is carried structurally by the artifact chain and PR summary (completion-contract), and by Phase 7 templates. |

Former release (6) — all merge into release-reviewer (core):

| Agent | Rationale / mapping |
| ----- | ------------------- |
| release-manager | ORCH/AUTH: "orchestrate release end-to-end" implies coordination authority no agent may hold. The readiness-evidence duty is the release reviewer. |
| changelog | Checklist (extract user-visible changes, categorize) becomes the release reviewer's CHANGELOG completeness check; drafting text is finding output, not file edits. |
| versioning | Semver-compliance check becomes a release reviewer checklist item. |
| evidence-collector | Evidence gathering is the Release-Readiness Summary itself ([format](completion-contract.md#4-artifact-format-release-readiness-summary)). |
| migration-guide | Migration-notes-for-breaking-changes check becomes a release reviewer checklist item; writing a migration guide is ordinary documentation work through the normal lifecycle. Covers the phase doc's "migration" specialist slot — see section 3.4. |
| post-release-review | Post-release verification stays with the Maintainer (G7 is outside the day-to-day loop; lifecycle section 6). |

Former internal (10) — all retire:

| Agent | Rationale |
| ----- | --------- |
| main-orchestrator | ORCH: explicit orchestration concept, banned by the master prompt and the phase doc. Sequencing lives in the human session and Phase 4/5 skills. |
| agent-registry | ORCH: a registry layer implies a runtime; the catalog duty is served by `agentquilt agents list`. (Also the file whose manual tamper Phase 1 cleared.) |
| conflict-detector | DUP with the product itself: conflict-free parallel editing is AgentQuilt's core mechanism; residual conflicts belong to git and review. |
| definition-architect | SKILL: designing agent definitions is ordinary implementation work under this portfolio's contracts (and Phase 4/5 skill guidance). |
| instruction-block-author | SKILL: fragment authoring is ordinary implementation work. |
| instruction-refactoring | SKILL: same. |
| agent-behavior-reviewer | Duty moves to Phase 8 (scenario evaluation) supported by eval-designer. |
| agent-documentation | DUP with documentation-reviewer's fragment-currency check. |
| agent-migration | No trigger: no agent-definition version migrations exist or are planned pre-1.0. |
| prompt-compiler-guardian | Merged conceptually into deterministic-output (compiler output quality = determinism guarantees + golden coverage). |

### 3.4 Deviations from the phase doc specialist list, flagged honestly

The phase doc lists ten specialist candidates. Six are retained (security,
schema design, deterministic output, eval design, dependency/supply-chain
risk, requirements ambiguity). Four are not retained as separate agents,
because no real trigger plus real workflow can be written for them today:

- **Compatibility**: the lifecycle already assigns public-CLI and exit-code
  compatibility to the regression reviewer (RGR exit criteria), and
  persisted-format compatibility to the schema-design specialist. A third
  agent would own an already-owned decision.
- **Performance**: no benchmarks or perf CI exist to run; an agent with no
  executable workflow is a placeholder.
- **Developer experience**: no entry criterion or completion criterion can
  be stated; the concern surfaces naturally in review findings.
- **Migration**: reduced to a release-reviewer checklist item (breaking
  change implies migration notes); authoring a guide is normal documented
  work.

All four are recoverable from git and can be recreated the moment a genuine
trigger and workflow exist. This trade is what "agent count driven by
responsibility, not completeness theatre" (phase acceptance criterion) means
in practice.

## 4. Core-agent responsibility matrix (8 roles x 13 stages)

Exactly one accountable primary per stage. P = accountable primary,
s = supporting (produces input or acts on output within the stage), blank =
not engaged. Stage codes and per-stage definitions:
[lifecycle.md section 3](lifecycle.md#3-stage-catalog).

| Stage | analyst | planner | implementer | test-engineer | arch-reviewer | regr-reviewer | doc-reviewer | rel-reviewer | Human |
| ----- | ------- | ------- | ----------- | ------------- | ------------- | ------------- | ------------ | ------------ | ----- |
| CLS Classification | s | P | | | | | | | may classify directly |
| INV Investigation | P | s | | | | | | | |
| PLN Planning | s | P | | | | | | | |
| APP Approval | | s (presents plan) | | | | | | | P (Maintainer) |
| IMP Implementation | | | P | | | | | | |
| VER Focused verification | | | s | P | | | | | |
| REV Independent review | | | | | P | | | | |
| COR Correction loop | | | P (fixes) | | s (re-check) | | | | arbitrates disputes |
| RGR Regression review | | | | | | P | | | |
| DOC Documentation review | | | | | | | P | | |
| VAL Full validation | | | | P | | | | | |
| PRP PR preparation | | | P (assembles) | | | | | | opens/merges |
| REL Release readiness | | | | | | | | P | executes release |

Specialists never appear in this matrix as primaries: they engage inside REV
(specialist reviews), or advise INV/PLN, per their triggers (section 5).

Consistency note: lifecycle.md REV names "architecture reviewer and/or code
reviewer". Under this portfolio the architecture reviewer is the single
accountable REV primary and carries the code-review duties (decision D4);
lifecycle.md needs no edit — the architecture reviewer satisfies the stage
as written.

## 5. Routing matrix by task type and risk

### 5.1 By profile (which agents engage at which stages)

Profiles per [task-classification.md](task-classification.md) and
[lifecycle.md section 4](lifecycle.md#4-workflow-profiles).

| Profile | Stage sequence and engaged agents |
| ------- | --------------------------------- |
| Small | INV-light: repository-analyst (or the session directly) -> IMP: feature-implementer -> VER: feature-implementer runs focused tests -> REV as diff review: architecture-reviewer -> completion checks + PRP: feature-implementer. No planner artifact; classification is one line. |
| Standard | CLS+PLN: implementation-planner -> INV: repository-analyst -> APP (only if the plan flags a trigger): Maintainer -> IMP: feature-implementer per bounded task -> VER: test-engineer -> REV: architecture-reviewer -> COR: feature-implementer + original reviewer -> RGR: regression-reviewer -> DOC: documentation-reviewer -> VAL: test-engineer -> PRP: feature-implementer, Maintainer merges. |
| High-risk | As standard, plus: parallel repository-analyst instances at INV (disjoint questions); architecture plan section in PLN; APP mandatory; specialist reviews alongside REV per section 5.2 triggers; RGR with explicit compatibility verification; full evidence package at VAL; REL when release behavior is affected. |

### 5.2 By task type (typical classification and specialist routing)

Task types from the repository's high-risk trigger table
([task-classification section 2.1](task-classification.md#21-high-risk-triggers)):

| Task type | Typical class | Core routing | Specialists engaged |
| --------- | ------------- | ------------ | ------------------- |
| Doc typo; fragment wording fix + rebuild | small | small profile | none |
| Bug fix in one function with coverage | small | small profile | none |
| Ordinary feature or refactoring | standard | standard profile | none, unless a trigger below appears |
| New or changed tests / fixtures | standard | standard profile | deterministic-output if golden fixtures change |
| Agent-instruction or skill source changes | standard | standard profile | eval-designer (compiled-prompt semantics) |
| Vague or untestable issue/acceptance criteria | any | at CLS/INV | ambiguity-detector |
| Dependency addition or upgrade | standard or high | standard/high profile + APP (new-dependency gate) | supply-chain-risk |
| Schema or persisted-format change | high-risk | high-risk profile, APP mandatory | schema-design; deterministic-output if fixtures affected |
| Public CLI change (commands, flags, exit codes, config format) | high-risk | high-risk profile, APP mandatory | schema-design (config format); compatibility verified by regression-reviewer at RGR |
| Compiler semantics (normalization, hashing, ordering, adapters) | high-risk | high-risk profile, APP mandatory | deterministic-output; eval-designer if compiled prompts shift |
| Security-sensitive (validation, path resolution, YAML, secrets) | high-risk | high-risk profile, APP mandatory | security-review |
| Release behavior (versioning, packaging, release.yml) | high-risk | high-risk profile + REL | supply-chain-risk if publish surface changes |

Escalation rule: any trigger discovered mid-flight reclassifies upward
immediately ([task-classification section 4](task-classification.md#4-reclassification-rules));
the newly required specialists then engage.

## 6. Role contracts

Common to all agents (stated once here, restated in each compiled agent body
so every agent is self-contained):

- Governed by ADR-0004 and the [risk-and-approval-policy absolute rules](risk-and-approval-policy.md#2-absolute-rules-no-exceptions-any-profile):
  no agent approves, merges, tags, publishes, pushes, overrides CI, or
  hand-edits generated files (`AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`,
  `agentquilt.lock`).
- Review is independent of implementation: no agent reviews work it
  implemented.
- Artifacts are self-contained plain Markdown per the
  [handoff-contract](handoff-contract.md); formats are referenced by anchor,
  never restated.
- Plain text only; no emojis or pictographic symbols.

### 6.1 repository-analyst (core)

- Purpose: evidence-backed, read-only investigation of code, tests, docs,
  and history for a task (INV).
- Triggering conditions: every standard and high-risk change; light
  investigation in the small profile; multiple parallel instances on
  disjoint questions in the high-risk profile.
- Inputs: the task/issue; the Task Classification artifact (may be
  provisional).
- Required repository investigation: per
  [investigation-contract sections 2-3](investigation-contract.md#2-rules) —
  affected components with evidence; canonical-vs-generated status of every
  file that may be touched; test and doc surface mapping; constraint checks
  (gate triggers present in the affected area).
- Tools / permission scope: `permissions: read-only`; `x-claude.tools:
  "Read, Grep, Glob, Bash"` restricted by body text to read-only git
  commands (`git log`, `git show`, `git blame`, `git diff`) — see decision
  D2. Strict alternative: `Read, Grep, Glob` only, with history questions
  answered by the main session.
- Prohibited actions: editing any file; running state-changing commands;
  proposing final decisions; downgrading a classification.
- Expected output format: [Repository Investigation](investigation-contract.md#4-artifact-format-repository-investigation).
- Completion criteria: investigation exit criteria
  ([investigation-contract section 5](investigation-contract.md#5-exit-criteria));
  classification confirmed or escalated.
- Handoff destination: implementation-planner (PLN); directly IMP in the
  small profile.
- May edit files: no. Read-only: yes (execution limited to read-only git).

### 6.2 implementation-planner (core)

- Purpose: task classification (CLS) and implementation planning (PLN):
  bounded task breakdown, risk flags, gate-trigger identification,
  file-impact map.
- Triggering conditions: CLS for every change; PLN for standard and
  high-risk changes.
- Inputs: the task; the Repository Investigation artifact.
- Required repository investigation: consumes the investigation; verifies
  the gate-trigger checklist against the affected areas; confirms each
  planned task meets the
  [bounded-task definition](implementation-plan-contract.md#2-bounded-task-definition).
- Tools / permission scope: `permissions: read-only` (`Read, Grep, Glob`).
- Prohibited actions: implementing; editing files; downgrading a
  classification (human-only); approving its own plan; naming commands
  outside the [authoritative set](validation-evidence.md#3-authoritative-commands).
- Expected output format:
  [Task Classification](task-classification.md#3-artifact-format-task-classification)
  and [Implementation Plan](implementation-plan-contract.md#4-artifact-format-implementation-plan)
  (with architecture-plan section for high-risk).
- Completion criteria: plan exit criteria — ordered bounded tasks, every
  gate trigger flagged, test and rebuild steps per task
  ([implementation-plan-contract section 5](implementation-plan-contract.md#5-entry-and-exit-criteria)).
- Handoff destination: APP (Maintainer) when any trigger is flagged or
  profile is high-risk; otherwise per-task Implementation Handoffs to the
  feature-implementer.
- May edit files: no. Read-only: yes.

### 6.3 feature-implementer (core)

- Purpose: execute exactly one approved bounded task per Implementation
  Handoff (IMP); fix findings in the correction loop (COR); assemble the PR
  summary (PRP).
- Triggering conditions: a dispatchable Implementation Handoff exists
  ([criteria](handoff-contract.md#5-entry-and-exit-criteria)); for COR,
  BLOCKER/HIGH findings exist; for PRP, validation evidence is complete.
- Inputs: the handoff; the plan; the investigation; for COR, the Review
  Findings.
- Required repository investigation: confirm the canonical-vs-generated
  status of every allowed file before editing; read the covering tests for
  the touched area.
- Tools / permission scope: `permissions: workspace` (no tools restriction
  emitted; full edit and execution capability inside the working tree).
- Prohibited actions: starting without a plan and handoff; touching files
  outside the handoff's allowed set (scope expansion goes back to the
  planner); hand-editing generated files (fragment edits are followed by
  `npx agentquilt build` in the same task); adding dependencies; destructive
  git operations; pushing; publishing; reviewing its own work.
- Expected output format: the diff plus a
  [Return Handoff](handoff-contract.md#4-artifact-format-return-handoff-implementer-to-reviewer);
  at PRP, the [PR Summary](completion-contract.md#3-artifact-format-pr-summary).
- Completion criteria: the handoff's done criteria met; focused verification
  passing; deviations recorded; generated/fixture sections of the return
  handoff answered.
- Handoff destination: test-engineer (VER) / architecture-reviewer (REV);
  Maintainer at PRP.
- May edit files: yes (within the handoff's allowed set). Read-only: no.

### 6.4 test-engineer (core)

- Purpose: focused verification per bounded task (VER) and full validation
  (VAL); select, run, and report tests; add missing coverage for changed
  code.
- Triggering conditions: a bounded task's diff exists (VER); all reviews
  closed (VAL).
- Inputs: the diff; the plan's per-task test requirements; the
  [authoritative command set](validation-evidence.md#3-authoritative-commands).
- Required repository investigation: identify the tests covering the changed
  code; identify coverage gaps introduced by the diff.
- Tools / permission scope: `permissions: workspace` with `x-claude.tools:
  "Read, Grep, Glob, Bash, Edit, Write"`; body text restricts edits to test
  code and test fixtures.
- Prohibited actions: weakening assertions, broadening matchers, or skipping
  cases to make tests pass; updating fixtures or baselines without a
  root-cause explanation and the required approval
  ([policy](risk-and-approval-policy.md#6-baseline-and-snapshot-changes));
  editing production code; running commands outside the authoritative set.
- Expected output format: focused results recorded in the Return Handoff
  (VER); [Validation Evidence](validation-evidence.md#5-artifact-format-validation-evidence)
  (VAL).
- Completion criteria: VER — tests relevant to the change pass or failures
  are handed back to IMP; VAL — full deterministic suite passes (typecheck,
  tests, coverage 75 percent lines / 65 percent branches, build, drift
  check).
- Handoff destination: feature-implementer on failure; REV after VER; PRP
  after VAL.
- May edit files: test code and fixtures only. Read-only: no.

### 6.5 architecture-reviewer (core)

- Purpose: independent review (REV): design conformance, ADR necessity,
  schema and public-interface impact, plus code-level correctness (error
  handling, test adequacy, security-relevant patterns) per the
  [review checklist](review-contract.md#4-agentquilt-specific-review-checklist).
  Carries the merged content of the former architecture, adr-writer,
  code-review, and reviewer agents.
- Triggering conditions: REV in the standard and high-risk profiles; the
  diff review of the small profile.
- Inputs: full diff, return handoffs, plan, investigation.
- Required repository investigation: verify the diff against the recorded
  classification and plan (excess is a HIGH finding); check ADR necessity
  per CONTRIBUTING.md; walk the review-contract checklist for every touched
  area.
- Tools / permission scope: `permissions: read-only` (`Read, Grep, Glob`).
- Prohibited actions: fixing anything (resolution belongs to COR); approving
  or merging; reviewing work it implemented; finalizing or accepting an ADR
  (may draft a skeleton for human refinement).
- Expected output format:
  [Review Findings](review-contract.md#52-finding-format) with the
  BLOCKER/HIGH/MEDIUM/LOW/SUGGESTION ladder; every finding carries evidence,
  impact, and a proposed verification method.
- Completion criteria: findings issued in the required format; re-check of
  resolved BLOCKER/HIGH findings during COR using each finding's proposed
  verification method.
- Handoff destination: correction loop (feature-implementer); findings table
  travels into the PR summary.
- May edit files: no. Read-only: yes.

### 6.6 regression-reviewer (core)

- Purpose: regression review (RGR): behavior deltas, generated-output drift,
  golden-file and fixture diffs traced to a root cause, public CLI behavior
  and exit-code compatibility. Carries the merged duties of the former
  regression-scope, compatibility-test, and (diff-facing half of)
  golden-file-test agents.
- Triggering conditions: correction loop closed (standard/high-risk); any
  diff touching generated outputs, fixtures, or adapters.
- Inputs: full diff; validation runs so far.
- Required repository investigation: enumerate every generated file and
  fixture in the diff; trace each to its causing source change.
- Tools / permission scope: `permissions: read-only`; `x-claude.tools:
  "Read, Grep, Glob, Bash"` restricted by body text to the deterministic
  check commands (`npx agentquilt check`, `npm test`, targeted golden test
  runs) — see decision D2.
- Prohibited actions: regenerating outputs (rebuilds belong to the
  implementer's task); accepting a golden/fixture diff without a recorded
  root cause (that is a BLOCKER by contract); editing any file; approving
  baseline changes (human-only).
- Expected output format: regression findings in the
  [review findings format](review-contract.md#52-finding-format), explicitly
  covering the four RGR areas plus the executed checks with exit codes.
- Completion criteria: RGR exit criteria — every generated-output and
  fixture change has a recorded cause; drift check passes; compatibility
  statement recorded.
- Handoff destination: COR if findings; otherwise DOC/VAL.
- May edit files: no. Read-only: yes (executes deterministic checks only).

### 6.7 documentation-reviewer (core)

- Purpose: documentation review (DOC): doc impact and staleness of the diff,
  with the explicit check that `AGENTS.md`/`CLAUDE.md` remain current via
  their source fragments under `.agentquilt/agents/project/`.
- Triggering conditions: correction loop closed (standard/high-risk); any
  diff changing behavior described in docs (commands, layout, process,
  counts).
- Inputs: full diff; docs tree (`.docs/`, `README.md`, `CONTRIBUTING.md`,
  project-guide fragments).
- Required repository investigation: map each behavioral change in the diff
  to the documents that describe that behavior; check cross-references and
  section anchors that the diff may have broken.
- Tools / permission scope: `permissions: read-only` (`Read, Grep, Glob`).
- Prohibited actions: rewriting docs beyond findings (fixes are COR/IMP
  work); proposing edits to generated guides directly (findings point at the
  fragments).
- Expected output format: documentation findings in the
  [review findings format](review-contract.md#52-finding-format).
- Completion criteria: doc impact addressed or logged as follow-up (DOC exit
  criteria).
- Handoff destination: COR if findings; otherwise VAL.
- May edit files: no. Read-only: yes.

### 6.8 release-reviewer (core)

- Purpose: release readiness (REL): assemble evidence that a release is safe
  to execute — CHANGELOG completeness and categorization, semver compliance
  of the version bump, migration notes present for any breaking change, risk
  register status, validation evidence and drift-check state. Carries the
  merged checklists of the six former release agents.
- Triggering conditions: a release is planned and `main` is green.
- Inputs: CHANGELOG, package version, `policies/risks/risk-register.yaml`,
  the Validation Evidence artifact, recent commit history.
- Required repository investigation: diff user-visible behavior since the
  last release tag against the CHANGELOG; verify version-bump semantics
  against the changes; check open high/critical register entries.
- Tools / permission scope: `permissions: read-only` (`Read, Grep, Glob`).
  It consumes validation evidence rather than re-running checks; this keeps
  it strictly read-only and distinguishable from the regression reviewer.
- Prohibited actions: publishing, tagging, pushing, or bumping versions
  (human-only per [release-process.md](../sdlc/release-process.md)); editing
  the CHANGELOG or register (proposed text goes in the summary as
  suggestions).
- Expected output format:
  [Release-Readiness Summary](completion-contract.md#4-artifact-format-release-readiness-summary).
- Completion criteria: summary complete with evidence for every checklist
  item; blocking items named explicitly.
- Handoff destination: the Maintainer, who executes the release steps.
- May edit files: no. Read-only: yes.

### 6.9 security-review (specialist)

- Purpose: targeted security review of high-risk diffs: input validation,
  path resolution, YAML parsing, secret handling, committed-secret patterns,
  and injection surface of compiled prompts. Absorbs the former
  secret-leakage-detection pattern list and prompt-injection-test scenarios.
- Triggering conditions: the security high-risk trigger
  ([task-classification section 2.1](task-classification.md#21-high-risk-triggers));
  diffs touching `src/core/configLoader.ts`, `src/core/fragmentScanner.ts`,
  or `src/core/adapters/`; suspected secrets in a diff; changes to how
  untrusted content reaches compiled outputs.
- Inputs: full diff, plan, investigation; the threat patterns in its own
  body.
- Required repository investigation: trace untrusted input paths (config,
  fragments, front-matter, CLI args) through the touched code; scan the diff
  for secret patterns.
- Tools / permission scope: `permissions: read-only` (`Read, Grep, Glob`).
- Prohibited actions: approving security decisions or risk acceptance;
  fixing; removing or revoking secrets (human responsibility — it flags and
  recommends revocation).
- Expected output format: specialist findings in the
  [review findings format](review-contract.md#52-finding-format), including
  adversarial test inputs as proposed verification methods.
- Completion criteria: every touched trust boundary assessed; findings carry
  reproducible payloads or pattern matches as evidence.
- Handoff destination: COR alongside REV findings.
- May edit files: no. Read-only: yes.

### 6.10 schema-design (specialist)

- Purpose: review of schema and persisted-format changes: breaking-change
  detection, default/migration requirements, validation completeness,
  up/down compatibility, and JSON Schema / Zod parity
  (`schemas/*.schema.json` vs `packages/agentquilt-cli/src/schemas/`).
- Triggering conditions: the schemas-or-persisted-formats high-risk trigger:
  `schemas/*.schema.json`, Zod schemas, manifest/block format, lock format,
  golden fixture format.
- Inputs: the diff; both schema surfaces; the plan's compatibility claims.
- Required repository investigation: compare JSON Schema and Zod definitions
  field-by-field for the touched types; find persisted instances of the old
  format in fixtures and user-facing docs.
- Tools / permission scope: `permissions: read-only` (`Read, Grep, Glob`).
- Prohibited actions: approving persisted-format changes (Maintainer gate);
  editing schemas; waiving migration requirements.
- Expected output format: specialist findings in the
  [review findings format](review-contract.md#52-finding-format).
- Completion criteria: a compatibility verdict per changed field (breaking /
  additive / cosmetic) with evidence; parity confirmed or a parity finding
  issued.
- Handoff destination: COR alongside REV findings; PLN advisory notes when
  consulted before implementation.
- May edit files: no. Read-only: yes.

### 6.11 deterministic-output (specialist)

- Purpose: guard the compiler's determinism guarantees when compiler
  semantics change: LF normalization before hashing, code-point ordering (no
  `localeCompare`), stable output for unchanged sources, target versioning,
  adapter serialization; adequacy of golden-file coverage for the change.
  Successor to the golden-file-test seed and the prompt-compiler-guardian
  concept.
- Triggering conditions: the compiler-semantics high-risk trigger
  (normalization, hashing, ordering, target versioning, adapters — notably
  `src/core/compiler.ts`, `src/core/normalize.ts`,
  `src/core/fragmentScanner.ts`, `src/core/agentCompiler.ts`,
  `src/core/adapters/`); any golden fixture change.
- Inputs: the diff; golden fixtures under
  `packages/agentquilt-cli/tests/fixtures/`; the plan.
- Required repository investigation: identify which determinism invariant
  each touched code path participates in; map the golden scenarios that
  exercise it.
- Tools / permission scope: `permissions: read-only`; `x-claude.tools:
  "Read, Grep, Glob, Bash"` restricted by body text to `npm test` (targeted
  golden runs) and `npx agentquilt check` — see decision D2.
- Prohibited actions: updating golden fixtures or baselines (BLOCKER if
  unexplained; approval is human-only); editing any file.
- Expected output format: specialist findings in the
  [review findings format](review-contract.md#52-finding-format), with
  executed check commands and exit codes.
- Completion criteria: an invariant-by-invariant verdict for the touched
  semantics; golden coverage gaps named as findings.
- Handoff destination: COR alongside REV findings.
- May edit files: no. Read-only: yes (executes deterministic checks only).

### 6.12 eval-designer (specialist)

- Purpose: design and assess behavioral evals for compiled agent
  instructions: static prompt-presence checks, mock-response evals, and
  semantic-shift detection between compiled prompt versions (absorbing the
  former semantic-regression duty). Supports Phase 8 scenario evaluation.
- Triggering conditions: changes to agent instruction sources under
  `.agentquilt/agents/` (beyond mechanical rebuilds), to skills, or to eval
  strategy; new or renamed agents; a reviewer flags a possible semantic
  shift in compiled output.
- Inputs: the diff of instruction sources and compiled outputs; baseline
  compiled prompts from the base branch; eval strategy docs.
- Required repository investigation: compare compiled prompts before/after
  for meaning changes (constraints, priorities, safety rules), not just
  wording; check existing eval coverage for the touched agents.
- Tools / permission scope: `permissions: read-only` (`Read, Grep, Glob`).
- Prohibited actions: approving baseline updates (human-only); editing
  sources; running live model calls (evals it designs run manually, never in
  CI).
- Expected output format: specialist findings in the
  [review findings format](review-contract.md#52-finding-format); proposed
  eval cases as draft artifacts for human adoption.
- Completion criteria: a semantic-shift verdict with quoted before/after
  evidence; proposed evals have pass/fail conditions.
- Handoff destination: COR alongside REV findings; Phase 8 rubric work.
- May edit files: no. Read-only: yes.

### 6.13 supply-chain-risk (specialist)

- Purpose: evidence for the new-dependency approval gate and for dependency
  upgrades: license compatibility, maintenance health, install scripts and
  postinstall behavior, transitive dependency surface, typosquatting risk,
  lockfile diff sanity, published-package surface impact.
- Triggering conditions: any `package.json` dependency addition or change;
  a `package-lock.json` diff introducing new dependency edges; changes to
  the published `files`/`bin` surface.
- Inputs: the manifest and lockfile diffs; the plan's justification for the
  dependency.
- Required repository investigation: inspect the lockfile diff for the full
  transitive delta; check the package's install scripts; verify the version
  is pinned per repo convention.
- Tools / permission scope: `permissions: read-only`; `x-claude.tools:
  "Read, Grep, Glob, Bash"` restricted by body text to read-only commands
  (`npm ls`, `npm view`, `npm audit --dry-run`-style queries) — see D2.
- Prohibited actions: approving the dependency (Maintainer gate); editing
  manifests or the lockfile; adding or removing dependencies.
- Expected output format: specialist findings in the
  [review findings format](review-contract.md#52-finding-format), concluding
  with a recommend / recommend-against statement for the Maintainer's gate
  decision.
- Completion criteria: license, scripts, transitive surface, and maintenance
  signals each assessed with evidence.
- Handoff destination: APP (evidence for the gate decision) and COR.
- May edit files: no. Read-only: yes.

### 6.14 ambiguity-detector (specialist)

- Purpose: flag vague or untestable language in issues, acceptance criteria,
  and plans; propose concrete, testable phrasing and edge cases. Absorbs the
  former requirements-analyst testability checklist.
- Triggering conditions: at CLS/INV when the task's acceptance criteria are
  missing, subjective, or unfalsifiable; on request when a plan's done
  criteria are not checkable.
- Inputs: the issue/task text; the classification; the plan's done criteria.
- Required repository investigation: check claimed behavior against actual
  repository behavior where the ambiguity is factual (for example, a vague
  claim about an exit code).
- Tools / permission scope: `permissions: read-only` (`Read, Grep, Glob`).
- Prohibited actions: approving requirements; rewriting the issue (proposes
  text, humans adopt it); blocking work.
- Expected output format: findings-style list (same
  [format](review-contract.md#52-finding-format)) with proposed concrete
  phrasing per flag; feeds the classification artifact's rationale.
- Completion criteria: every vague criterion flagged has a proposed testable
  replacement and suggested edge cases.
- Handoff destination: implementation-planner (CLS/PLN) or the issue.
- May edit files: no. Read-only: yes.

## 7. Design-rule conformance

Phase doc design rules, checked against the contracts above:

| Rule | How the portfolio satisfies it |
| ---- | ------------------------------ |
| Exploration and review agents read-only | analyst, planner, all four core reviewers, and all six specialists carry `permissions: read-only`; the only Bash grants on read-only roles are body-restricted to read-only/deterministic commands (D2), with Phase 6 guardrails to enforce. |
| Implementer edits only after a plan exists | feature-implementer's entry condition is a dispatchable Implementation Handoff derived from a plan; starting without one is a prohibited action. |
| Review independent from implementation | stated in the common contract; the implementer never reviews its own diff and reviewers never fix. |
| Specialists trigger only when relevant | every specialist's triggers are tied to the task-classification high-risk triggers or the approval-gate triggers; none engages by default. |
| Release reviewer never publishes or tags | prohibited actions in 6.8; also an absolute rule in risk-and-approval-policy. |
| No agent merges or overrides CI | common contract, restated in every compiled body. |
| No two agents own the same decision | one accountable primary per stage (section 4); overlap eliminations documented in section 3 (compatibility, code review, release duties, risk register). |

## 8. Expressible manifest surface (no compiler changes)

Verified against `packages/agentquilt-cli/src/schemas/agentDefinition.schema.ts`
and `src/core/adapters/claude.ts` (adapter version 2):

- `agent.yaml` supports: `description` (required; Claude Code uses it for
  delegation routing, so descriptions below are trigger-bearing), `name`
  (optional; defaults to directory name), `model` (tier `frontier | balanced
  | fast | inherit`, or object with `tier`/`reasoning`/`overrides`),
  `permissions` (`read-only | workspace | full`), plus arbitrary `x-<platform>`
  extension blocks.
- The Claude adapter emits frontmatter: `name`, `description`, `model` (tier
  shortname), `tools` (from `x-claude.tools` override, else
  `Read, Grep, Glob` for read-only, else omitted for workspace/full),
  `permissionMode` (from `x-claude.permissionMode`, else `acceptEdits` for
  full), `effort` (from model reasoning), and every remaining `x-claude` key
  verbatim (for example `memory: project`).
- Therefore expressible per agent without compiler work: per-agent tool
  lists (including adding `Bash`, `Edit`, `Write`), permission modes, model
  tiers, and memory. NOT expressible in frontmatter: command-level Bash
  restrictions, prohibited-action enforcement, or handoff rules — these live
  in the instruction body (and Phase 6 adds provider-level guardrails via
  settings/hooks).
- Proposed manifests use `model: balanced` throughout (matching current
  state); tier changes are a one-line manifest edit later if pilot evidence
  warrants.

## 9. Segment 2 change plan (what is executed after approval)

All changes are to canonical sources followed by a rebuild; no generated
file is hand-edited. `.planning/` and `outputs/state.json` are untouched.

### 9.1 `.agentquilt/agents/` — created (9 directories)

Each gets `agent.yaml` (trigger-bearing `description`, `model: balanced`,
`permissions` per contract, `x-claude.tools` where the contract specifies)
plus fragments numbered with gaps of 10: `010-role.md` (purpose, triggers,
authority boundaries and prohibitions from the contract), a
`020-<stage>-workflow.md` (stage workflow with Phase 2 anchor references),
and where noted a `030-` fragment with merged seed content:

| Directory | Fragment sources beyond new text |
| --------- | -------------------------------- |
| repository-analyst/ | investigation-contract structure; nothing inherited |
| implementation-planner/ | classification + plan contract structure |
| feature-implementer/ | handoff-contract structure |
| test-engineer/ | adapted test-runner `010-role.md` execution workflow (VER/VAL framing, authoritative commands) |
| architecture-reviewer/ | merged checklists from architecture, adr-writer, code-review (checklist, priorities, example comments), reviewer |
| regression-reviewer/ | golden-file-test workflow; RGR checklist (drift, golden, fixtures, CLI compatibility) |
| documentation-reviewer/ | new content; fragment-currency check |
| release-reviewer/ | merged checklists from changelog, versioning, migration-guide, evidence-collector |
| deterministic-output/ | golden-file-test workflow; determinism invariant list |

### 9.2 `.agentquilt/agents/` — rewritten in place (5 directories)

- `security-review/`: `010-role.md` rewritten to the 6.9 contract; the
  threat-assessment fragments (020-060, previously adoption split
  artifacts) consolidated into `020-threat-assessment.md` and
  `030-secret-patterns.md` (absorbing secret-leakage-detection patterns
  and prompt-injection-test scenarios).
- `schema-design/`: `010-role.md` rewritten to 6.10; `020-schema-change-review.md`
  kept and extended with JSON Schema / Zod parity.
- `eval-designer/`: `010-role.md` rewritten to 6.12; `020`-`040` workflow and
  example fragments kept; semantic-regression examples appended as
  `050-semantic-shift-examples.md`.
- `supply-chain-risk/`: both fragments replaced (stub -> 6.13 contract and a
  real dependency-review workflow).
- `ambiguity-detector/`: `010-role.md` rewritten to 6.14;
  `020-ambiguity-patterns-to-flag.md` kept, requirements-analyst testability
  checklist appended.

### 9.3 `.agentquilt/agents/` — deleted (41 directories)

All directories listed as merged or retired in section 3 — the 46 minus the
5 retained in 9.2 (count 41): adr-writer, agent-behavior-reviewer,
agent-documentation, agent-migration, agent-registry, architecture,
changelog, code-review, compatibility-test, conflict-detector,
defect-triage, definition-architect, developer-experience, documentation,
evidence-collector, gatekeeper, golden-file-test, implementation-planning,
instruction-block-author, instruction-refactoring, main-orchestrator,
migration-guide, performance-test, policy-compliance, post-release-review,
product-discovery, prompt-compiler-guardian, prompt-injection-test,
qa-strategy, regression-scope, release-manager, requirements-analyst,
reviewer, risk-register, secret-leakage-detection, semantic-regression,
test-automation, test-design, test-runner, traceability, versioning.

### 9.4 Compiled outputs and lock

- `agentquilt build` does not remove compiled outputs whose sources are
  deleted, and `agentquilt check` compares only expected outputs (verified
  in `src/commands/build.ts` / `src/commands/check.ts`). Segment 2 therefore
  `git rm`s the 41 orphaned `.claude/agents/*.md` files together with their
  sources. This is removal of an orphaned generated artifact as part of a
  source deletion, not a hand-edit.
- After rebuild: `.claude/agents/` contains exactly 14 files;
  `agentquilt.lock` regenerated (agent additions/removals recorded);
  `npx agentquilt check` exits 0.

### 9.5 `.agentquilt/config.yaml`

Unchanged. The single wildcard `agent-definitions` target (`agents: "*"`,
`platforms: [claude]`) discovers agents by the presence of `agent.yaml`, so
created and deleted directories are picked up automatically; the
`AGENTS.md`/`CLAUDE.md` markdown targets are unaffected.

### 9.6 Project guide fragments

`.agentquilt/agents/project/` fragments state "46 agent definitions" and
"Many are stubs pending rationalization" (in the architecture/status
fragments). Segment 2 updates those counts and the status wording to
describe the 14-agent portfolio and points at this document, then rebuilds
`AGENTS.md`/`CLAUDE.md` in the same commit.

### 9.7 Verification and commits

Per segment 2: `npx agentquilt build`; `npx agentquilt check` (exit 0);
`npm run build` and `npm test` in `packages/agentquilt-cli` (expected
unaffected — no product code changes); plain-text policy scan over all new
fragments; repo-wide grep for references to retired agent names in live
docs/policies (gate policies name product-discovery, requirements-analyst,
adr-writer, code-review, eval-designer, security-review, release-manager
after the Phase 1 scrub — the retired names among these get corrected to
their successors in the same segment, flagged in the report). Commits land
only in segment 2, after gate approval, grouped as: (1) portfolio sources +
rebuild, (2) project-guide fragment updates + rebuild, (3) policy name
corrections if approved.

## 10. Decision points for the Maintainer (gate)

Decided 2026-07-12: the Maintainer approved D1, D5, and D6 as proposed,
chose the pragmatic Bash grant for D2, retirement for D3, and the merge
into architecture-reviewer for D4. The record below preserves the options
as presented at the gate.

Recommended package (approving all of D1-D6 as recommended approves the
plan in section 9):

- **D1 — Dispositions and target portfolio.** 46 agents -> 14 (8 core + 6
  specialists) per section 3; 41 directories retired with the documented
  mapping; 4 phase-doc specialist candidates (compatibility, performance,
  developer experience, migration) not retained as separate agents per
  section 3.4. Recommendation: approve.
- **D2 — Bash on read-only roles.** repository-analyst (read-only git
  history), regression-reviewer and deterministic-output (deterministic
  checks), supply-chain-risk (read-only npm queries) get `x-claude.tools`
  including `Bash`, with body-text restrictions until Phase 6 guardrails
  enforce them. Alternative (strict): `Read, Grep, Glob` only, accepting
  that these roles cannot run git/check/npm commands themselves.
  Recommendation: pragmatic grant with body restrictions.
- **D3 — risk-register agent.** Retire (recommended; ownership already
  assigned to PLN/REL/Maintainer by the Phase 2 contracts) versus retain as
  a seventh specialist for register maintenance drafting. Genuine either-way
  choice: the content is real; only the ownership argument favors
  retirement.
- **D4 — code review ownership.** Merge code-review + reviewer into
  architecture-reviewer as the single REV owner (recommended) versus keeping
  a separate code-review diff specialist. Genuine either-way choice: the
  merge widens the architecture reviewer's scope; the split gives REV two
  owners.
- **D5 — naming.** New core directories use the role nouns
  (repository-analyst, ..., release-reviewer); retained specialists keep
  their existing directory names (security-review, schema-design,
  eval-designer, supply-chain-risk, ambiguity-detector) to preserve
  continuity; the one new specialist is `deterministic-output`.
  Recommendation: approve as stated.
- **D6 — segment 2 change list.** Sections 9.1-9.7 exactly, including
  deletion of the 41 orphaned compiled outputs, the unchanged config, the
  project-guide count updates, and the gate-policy name corrections.
  Recommendation: approve.
