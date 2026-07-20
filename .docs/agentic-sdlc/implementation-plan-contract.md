# Agentic SDLC — Implementation Plan Contract

Date: 2026-07-12
Status: Active (Phase 2 deliverable of the agentic SDLC effort)

## 1. Purpose and when it applies

The plan turns an investigation into an ordered list of bounded tasks that
an implementer can execute without re-deriving context, and gives the
Maintainer something concrete to approve. Required for standard and
high-risk changes; the small profile skips it. Adjacent stages: consumes the
[investigation](investigation-contract.md); its approval is governed by the
[risk-and-approval-policy](risk-and-approval-policy.md); each of its tasks
becomes an [implementation handoff](handoff-contract.md).

The planner is read-only and never implements
([target operating model](target-operating-model.md) section 4).

## 2. Bounded task definition

A bounded task:

- addresses one concern and is completable in one focused session;
- names its full allowed file set in advance, each file marked canonical or
  generated (generated files appear only as rebuild outputs, never edit
  targets);
- names the tests that verify it (existing to run, or new to write);
- has done criteria checkable from the repository;
- contains no approval-gate trigger — or names the trigger and the recorded
  approval that covers it;
- includes the rebuild step (`npx agentquilt build`) whenever it edits
  fragments, manifests, or `.agentquilt/config.yaml`, and the drift check
  (`npx agentquilt check`) as part of its done criteria.

Anything that cannot be bounded this way is split, or is a sign the change
is misclassified.

## 3. Plan rules

1. Tasks are ordered; dependencies between tasks are explicit. Default
   execution is sequential.
2. Every classification trigger found in investigation maps to a risk flag
   in the plan; every risk flag maps to a gate per the
   [risk-and-approval-policy](risk-and-approval-policy.md#3-approval-gate-triggers).
3. The plan states what is out of scope. Scope expansion during
   implementation is a deviation that goes back to the planner, not a silent
   addition.
4. Expected generated-output and fixture effects are declared up front: if
   the plan expects `AGENTS.md`/`CLAUDE.md`/`.claude/agents/*.md`/
   `agentquilt.lock` or golden fixtures to change, it says which and why —
   so reviewers can distinguish expected diffs from surprises.
5. Only authoritative commands
   ([validation-evidence section 3](validation-evidence.md#3-authoritative-commands))
   appear in verification steps.
6. High-risk plans add an architecture-plan section: alternatives
   considered, compatibility impact (public CLI, persisted formats,
   deterministic output), ADR decision (required or not, with the
   [governance list](../sdlc/governance.md) as the test), migration and
   rollback notes. Implementation is incremental: tasks small enough that
   each leaves the tree green.

## 4. Artifact format: Implementation Plan

```markdown
## Implementation Plan

- Task: <ref>  Classification: <class>
- Investigation: <artifact ref>
- Approval status: not required | pending <gate> | approved <decision ref>

### Risk flags

| Flag | Gate trigger | Approval ref |
| ---- | ------------ | ------------ |

### Bounded tasks (ordered)

#### T1 — <title>

- Goal: <one sentence>
- Allowed files: <path (canonical) | path (generated — rebuild only)>
- Depends on: <task ids or none>
- Tests: <run: ...> <add: ...>
- Rebuild required: yes/no (`npx agentquilt build` + `npx agentquilt check`)
- Done criteria: <checkable statements>

### Expected generated-output / fixture changes

- <file: expected change and cause, or "none expected">

### Out of scope

- <explicitly excluded work>

### Architecture plan (high-risk only)

- Alternatives considered: ...
- Compatibility impact: ...
- ADR: required (<subject>) | not required (<why>)
- Migration / rollback: ...

### Documentation impact

- <docs or project-guide fragments (.agentquilt/agents/project/) to update, or none>
```

## 5. Entry and exit criteria

- Entry: a complete investigation artifact; confirmed classification.
- Exit: every bounded task meets section 2; every trigger has a flag; the
  approval status line is accurate; expected output/fixture effects are
  declared. For plans requiring approval, the plan is not executable until
  the APP checkpoint records the decision.
