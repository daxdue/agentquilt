# Agentic SDLC — Lifecycle Contract

Date: 2026-07-12
Status: Active (Phase 2 deliverable of the agentic SDLC effort)
Scope: development process for this repository. Not a product feature.

## 1. Purpose and precedence

This document defines the provider-independent lifecycle that every change to
this repository follows. It is a contract a human or an agent can execute
manually, with no software runner: each stage is a checklist with explicit
entry criteria, inputs, outputs, and exit criteria. Provider CLIs (Claude
Code, Codex) implement it natively in later phases; nothing here requires
them.

Precedence and relationship to existing documents:

- For day-to-day development execution (issue to merged PR), **this document
  supersedes** the stage descriptions in [.docs/sdlc/lifecycle.md](../sdlc/lifecycle.md)
  and the gate lists in [.docs/sdlc/gates.md](../sdlc/gates.md) where they
  overlap. Those documents remain valid as program-level framing; their gates
  map onto this lifecycle's checkpoints (section 6).
- [Governance](../sdlc/governance.md), [ADR-0004](../architecture/adr/ADR-0004-ai-assistance-authority-model.md)
  (agents draft and recommend; humans approve, merge, release),
  [ADR-0003](../architecture/adr/ADR-0003-generated-markdown-policy.md)
  (generated-file policy), and
  [ADR-0012](../architecture/adr/ADR-0012-provider-native-agentic-sdlc-boundary.md)
  (provider-native boundary) are unchanged and binding.
- [Branching strategy](../sdlc/branching-strategy.md),
  [release process](../sdlc/release-process.md), CONTRIBUTING.md, the
  [test strategy](../stlc/test-strategy.md), and `policies/gates/*.yaml`
  remain authoritative for their subjects; this lifecycle references them
  instead of restating them.

Companion contracts (the full Phase 2 set):
[task-classification](task-classification.md),
[risk-and-approval-policy](risk-and-approval-policy.md),
[investigation-contract](investigation-contract.md),
[implementation-plan-contract](implementation-plan-contract.md),
[review-contract](review-contract.md),
[validation-evidence](validation-evidence.md),
[handoff-contract](handoff-contract.md),
[completion-contract](completion-contract.md).

## 2. Governing rules (apply to every stage)

1. Agents investigate, plan, implement bounded tasks, and review. Humans
   approve gate triggers, merge, and release (ADR-0004, ADR-0012).
2. Canonical sources are edited; generated files (`AGENTS.md`, `CLAUDE.md`,
   `.claude/agents/*.md`, `agentquilt.lock`) are rebuilt with
   `npx agentquilt build` and verified with `npx agentquilt check` — never
   hand-edited.
3. CI is deterministic and model-free. All LLM work happens in provider CLI
   sessions; its evidence travels in artifacts and the PR.
4. Review is always independent of implementation.
5. Every artifact is self-contained: the consumer must be able to act from
   the artifact plus the repository alone (see
   [handoff-contract](handoff-contract.md)).
6. Plain text only; no emojis or pictographic symbols.

## 3. Stage catalog

Each stage below lists entry criteria, inputs, outputs, and exit criteria.
The primary role names come from the
[target operating model](target-operating-model.md) section 4.

### CLS — Classification

- Primary role: implementation planner (or the human directly).
- Entry: a task exists (issue, defect, request, or maintenance need).
- Inputs: task description; issue fields if present.
- Outputs: Task Classification artifact
  ([format](task-classification.md#3-artifact-format-task-classification)).
- Exit: class (small / standard / high-risk) recorded with the trigger
  checklist answered; re-confirmed after investigation.

### INV — Investigation

- Primary role: repository analyst (read-only). High-risk profile may run
  several analysts in parallel on disjoint questions.
- Entry: classification exists (may be provisional).
- Inputs: task, classification artifact.
- Outputs: Repository Investigation artifact
  ([format](investigation-contract.md#4-artifact-format-repository-investigation)).
- Exit: affected components identified with evidence; canonical-vs-generated
  status of every file that may be touched is known; test and doc surface
  mapped; classification confirmed or escalated.

### PLN — Planning

- Primary role: implementation planner (read-only).
- Entry: investigation complete. Skipped in the small profile.
- Inputs: investigation artifact, classification.
- Outputs: Implementation Plan artifact
  ([format](implementation-plan-contract.md#4-artifact-format-implementation-plan));
  for high-risk, including the architecture-plan section and ADR draft when
  required.
- Exit: ordered bounded tasks defined; every gate trigger flagged; test and
  rebuild steps included per task.

### APP — Human approval checkpoint

- Owner: Maintainer (human). Agents never approve.
- Entry: the plan flags any gate trigger, or the profile is high-risk
  (mandatory), or the standard profile flagged plan approval.
- Inputs: plan + investigation artifacts.
- Outputs: recorded decision (approve / revise), referenced by ID in the plan
  and later in the PR.
- Exit: approval recorded, or the plan returns to PLN for revision.
- Details: [risk-and-approval-policy](risk-and-approval-policy.md).

### IMP — Implementation (bounded tasks)

- Primary role: feature implementer (write access; the only writing role
  besides the test engineer).
- Entry: an Implementation Handoff exists for the bounded task
  ([format](handoff-contract.md#3-artifact-format-implementation-handoff));
  for standard/high-risk, the plan is approved where approval was required.
- Inputs: the handoff; the plan; the investigation.
- Outputs: the diff; a Return Handoff (what changed, deviations, focused
  verification results).
- Exit: the task's done criteria met; no scope expansion; no generated file
  hand-edited (fragment edits are followed by `npx agentquilt build` inside
  the same task); focused verification passing.

### VER — Focused verification

- Primary role: test engineer (may execute commands). In the small profile
  the implementer performs this directly.
- Entry: a bounded task's diff exists.
- Inputs: the diff, the plan's test requirements.
- Outputs: focused test results recorded in the Return Handoff
  (commands, exit codes, counts).
- Exit: tests relevant to the change pass, or failures are handed back to IMP.
- Commands: only the authoritative set in
  [validation-evidence](validation-evidence.md#3-authoritative-commands).

### REV — Independent review

- Primary role: architecture reviewer and/or code reviewer (read-only);
  specialist reviewers for high-risk (security, schema, compatibility, eval).
- Entry: all bounded tasks implemented and focus-verified.
- Inputs: full diff, return handoffs, plan, investigation.
- Outputs: Review Findings artifact
  ([format and severities](review-contract.md)).
- Exit: findings issued; each finding has evidence, impact, and a proposed
  verification method.

### COR — Correction loop

- Primary roles: feature implementer (fixes), original reviewer (re-check).
- Entry: BLOCKER or HIGH findings exist.
- Inputs: Review Findings.
- Outputs: fixes plus a per-finding resolution log.
- Exit: BLOCKER findings fixed and re-verified; HIGH findings fixed or
  explicitly accepted by the Maintainer. After two unresolved correction
  rounds, escalate to the Maintainer
  ([review-contract section 6](review-contract.md#6-correction-loop)).

### RGR — Regression review

- Primary role: regression reviewer (read-only + may execute deterministic
  checks).
- Entry: correction loop closed.
- Inputs: full diff, validation runs so far.
- Outputs: regression findings (same format as REV), explicitly covering:
  behavior deltas, generated-output drift (`npx agentquilt check`),
  golden-file and fixture diffs (never accepted without explanation),
  public CLI behavior and exit-code compatibility.
- Exit: every generated-output and fixture change has a recorded cause;
  drift check passes; compatibility statement recorded.

### DOC — Documentation review

- Primary role: documentation reviewer (read-only).
- Entry: correction loop closed.
- Inputs: full diff, docs tree.
- Outputs: documentation findings (same format as REV), explicitly checking
  that `AGENTS.md`/`CLAUDE.md` remain current — via their source fragments
  under `.agentquilt/agents/project/`, never by editing the generated files.
- Exit: doc impact addressed or logged as follow-up.

### VAL — Full validation

- Primary role: test engineer.
- Entry: all reviews closed.
- Inputs: final tree.
- Outputs: Validation Evidence artifact
  ([format](validation-evidence.md#5-artifact-format-validation-evidence)).
- Exit: the full deterministic suite passes (typecheck, tests, coverage
  thresholds 75% lines / 65% branches, build, drift check).

### PRP — PR preparation

- Primary role: feature implementer assembles; Maintainer opens/merges.
- Entry: validation evidence complete.
- Inputs: all artifacts of this change.
- Outputs: PR Summary
  ([format](completion-contract.md#3-artifact-format-pr-summary)).
- Exit: PR carries the evidence chain; merge is a human act
  ([branching strategy](../sdlc/branching-strategy.md)).

### REL — Release readiness (only when releasing)

- Primary role: release reviewer (read-only; never publishes, tags, or
  pushes).
- Entry: a release is planned; `main` is green.
- Inputs: CHANGELOG, version, risk register, validation evidence.
- Outputs: Release-Readiness Summary
  ([format](completion-contract.md#4-artifact-format-release-readiness-summary)).
- Exit: Maintainer approves release by merging the Version Packages PR; the
  pinned workflow executes the mechanics per
  [release-process.md](../sdlc/release-process.md).

## 4. Workflow profiles

Profile selection is the first act of every change
([task-classification](task-classification.md)).

### 4.1 Small change (isolated, low risk)

Single session; no formal plan; classification recorded as one line in the
PR. Sequence:

1. INV (light: confirm the fix location, canonical/generated status, and the
   covering tests; evidence still required)
2. IMP (one bounded task)
3. VER (focused tests)
4. REV as diff review (independent read of the final diff against the
   review-contract checklist; findings format applies)
5. Required completion checks
   ([completion-contract section 2.1](completion-contract.md#21-small-profile))
6. PRP (compact PR summary)

If any gate trigger appears at any step, stop and reclassify upward.

### 4.2 Standard change (ordinary features and refactoring)

CLS -> INV -> PLN -> APP (only if the plan flags a trigger) -> IMP per
bounded task -> VER per task -> REV -> COR -> RGR -> DOC -> VAL -> PRP.

### 4.3 High-risk change (schemas, public interfaces, security, release behavior, persistence, compiler semantics)

CLS -> INV (parallel read-only investigation permitted) -> PLN with
architecture plan -> APP (mandatory human approval; ADR when required per
[governance ADR policy](../sdlc/governance.md)) -> IMP incremental (small
bounded tasks, re-verified each step) -> specialist reviews + REV -> COR ->
RGR with explicit compatibility verification -> DOC -> VAL producing the
full evidence package -> PRP -> human-controlled merge; REL when the change
affects release behavior.

## 5. Handoff chain

```
task -> [CLS] classification -> [INV] investigation -> [PLN] plan
     -> (APP approval when triggered)
     -> per bounded task: [IMP+VER] handoff -> diff + return handoff
     -> [REV/COR] review findings + resolutions
     -> [RGR][DOC] regression + documentation findings
     -> [VAL] validation evidence
     -> [PRP] PR summary  -> human merge
     -> ([REL] release-readiness summary -> human release)
```

Artifact-passing rules live in the [handoff-contract](handoff-contract.md).

## 6. Mapping to the existing G0-G7 gates

| Existing gate ([gates.md](../sdlc/gates.md)) | Where it lands in this lifecycle |
| -------------------------------------------- | -------------------------------- |
| G0 Intake, G1 Requirements | Upstream of this lifecycle: issue intake (GitHub forms, Phase 7). CLS and INV consume their outputs. |
| G2 Architecture | PLN + APP in the high-risk profile (ADR requirement unchanged). |
| G3 Implementation | IMP rules (structure, no hand-edited generated files, error handling). |
| G4 Test readiness | The plan's per-task test requirements + VER. |
| G5 PR quality | VAL + deterministic CI. Note: G5 lists lint, but lint is not currently a CI step (audit section 2); until Phase 7 aligns CI, the authoritative check set is in [validation-evidence](validation-evidence.md). |
| G6 Release | REL + [release-process.md](../sdlc/release-process.md). |
| G7 Post-release | Unchanged; outside the day-to-day loop, remains in `.docs/sdlc/`. |

## 7. Manual execution

Every stage above is executable by one human with a shell and this
repository: read the stage's contract, produce the artifact as a Markdown
block (in the issue, the PR description, or a scratch file), run the listed
commands, and record the results. No stage depends on a provider feature, a
runner, or any automation beyond the existing npm/agentquilt commands.
