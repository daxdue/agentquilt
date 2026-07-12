# Agentic SDLC — Risk and Approval Policy

Date: 2026-07-12
Status: Active (Phase 2 deliverable of the agentic SDLC effort)

## 1. Purpose and when it applies

This policy defines where a human decision is mandatory in the
[lifecycle](lifecycle.md) and what evidence that decision requires. It
applies to every profile, every role, and every provider. It implements the
authority model of
[ADR-0004](../architecture/adr/ADR-0004-ai-assistance-authority-model.md) and
[governance.md](../sdlc/governance.md)
(**agents draft and recommend; humans approve, merge, and release**) and the
boundary rules of
[ADR-0012](../architecture/adr/ADR-0012-provider-native-agentic-sdlc-boundary.md).
Adjacent stages: consumed at the APP checkpoint and by every reviewer; the
[implementation-plan-contract](implementation-plan-contract.md) requires
plans to flag these triggers.

## 2. Absolute rules (no exceptions, any profile)

1. No agent approves a plan, approves a PR, merges, tags, pushes, publishes,
   or overrides CI.
2. No agent performs a destructive operation (file/branch deletion beyond
   the approved task scope, history rewrite, force push, legacy removal)
   without a prior recorded human approval of the specific operation.
3. Release creation and publication (`npm version`, tag push, `npm publish`)
   are performed by the Maintainer only, per
   [release-process.md](../sdlc/release-process.md).
4. Generated files are never hand-edited; a hand-edit is not approvable — it
   is redone via the canonical source and `npx agentquilt build`.

## 3. Approval gate triggers

An agent must stop BEFORE performing any of these and obtain a recorded
human decision. These are the same triggers that force the high-risk class
in [task-classification](task-classification.md).

| Trigger | What approval covers | Evidence required at the gate |
| ------- | -------------------- | ----------------------------- |
| High-risk architecture change | The design direction (compiler core, adapter system, restructuring agent sources); whether an ADR is required | Investigation + plan with alternatives considered |
| Public interface change | CLI commands/flags/output/exit codes, config format, published package surface | Compatibility statement: what existing users see before/after |
| New dependency | Any `package.json` dependency addition, dev or prod | Why no existing capability suffices; supply-chain note |
| Persisted-format change | `agentquilt.lock` format, `schemas/*.schema.json`, manifest/block format, fixture format | Migration/compatibility note; which persisted data becomes unreadable |
| Generated-output semantics change | How `build`/`check`/adapters produce or verify outputs | Before/after example of a compiled output; drift-gate impact |
| Destructive operation | The exact inventory of what is deleted/rewritten | Item-by-item list with evidence each item is safe to remove |
| Release | The release itself | Release-Readiness Summary ([completion-contract](completion-contract.md)) |

ADR requirement: the [governance ADR policy](../sdlc/governance.md) list
(project structure, source format, generated artifact policy, CI gates,
security model, eval strategy, release process, CLI names) is unchanged; the
architecture gate above decides whether it applies, and the ADR ships in the
same PR as the change.

## 4. Plan approval by profile

| Profile | Plan approval |
| ------- | ------------- |
| Small | None required (a small change by definition hits no trigger; if one appears, reclassify — [task-classification section 4](task-classification.md#4-reclassification-rules)). |
| Standard | Required only when the plan flags a trigger, or when the Maintainer asks for it. |
| High-risk | Always required, before any implementation. ADR decision made at the same checkpoint. |

Within an approved plan, low-risk bounded tasks do not require repeated
per-task approval; the trigger list in section 3 always does, even
mid-implementation.

## 5. Recording decisions

Every approval is recorded where the work lives (issue comment, PR
description, or the plan artifact itself) with: what was approved (artifact
ref or inventory), the decision (approve / revise / reject), any conditions,
who decided, and the date. Later artifacts reference the decision rather
than restating it.

Single-maintainer reality (audit risk R9): with one maintainer, approvals
are self-approvals. They still exist — as a deliberate, recorded pause with
the required evidence in front of the decision — because the record is what
makes agent-assisted work auditable. To keep this honest rather than
ceremonial, the small profile stays genuinely small (no plan, no formal
gate) and the trigger list, not paperwork appetite, decides when a gate
fires.

## 6. Baseline and snapshot changes

Golden files, fixtures, and eval baselines are decision points, never
auto-accepted:

- A test or fixture update that makes a failing check pass is a change to
  the definition of correct. The agent must explain WHY the output changed
  (root cause in the source, not "updated snapshot"), per the baseline
  workflow in [regression-strategy.md](../stlc/regression-strategy.md).
- The Maintainer approves baseline updates explicitly (in review or at a
  gate); an unexplained fixture diff is a BLOCKER finding
  ([review-contract](review-contract.md)).
- The same applies to regenerated outputs: `AGENTS.md`, `CLAUDE.md`,
  `.claude/agents/*.md`, `agentquilt.lock` diffs must trace to a named
  source change and a rebuild.

## 7. Risk register

`policies/risks/risk-register.yaml` remains the repository's risk log. Its
role in this lifecycle:

- High-risk changes check the register for open critical/high risks touching
  the affected area (also a G6 release condition,
  [release-process.md](../sdlc/release-process.md)).
- New risks discovered during investigation or review are proposed as
  register updates in their own change (the register is a policy file;
  agents draft entries, the Maintainer accepts them).
- Register entries are evidence for classification and gate decisions, not a
  substitute for them.
