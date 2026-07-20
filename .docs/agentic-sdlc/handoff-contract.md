# Agentic SDLC — Handoff Contract

Date: 2026-07-12
Status: Active (Phase 2 deliverable of the agentic SDLC effort)

## 1. Purpose and when it applies

This contract defines how work moves between roles and stages: which
artifact each stage hands to the next, the self-containment rule that makes
handoffs work across separate sessions and providers, and the Implementation
Handoff artifact that dispatches one bounded task to the implementer. It
applies wherever two stages of the [lifecycle](lifecycle.md) meet.

## 2. Handoff chain and rules

| Producer (stage) | Artifact | Consumer (stage) |
| ---------------- | -------- | ---------------- |
| Classification (CLS) | [Task Classification](task-classification.md#3-artifact-format-task-classification) | Investigation, and the PR |
| Investigation (INV) | [Repository Investigation](investigation-contract.md#4-artifact-format-repository-investigation) | Planning (or directly IMP in small) |
| Planning (PLN) | [Implementation Plan](implementation-plan-contract.md#4-artifact-format-implementation-plan) | Approval checkpoint; then per-task handoffs |
| Approval (APP) | Recorded decision ([policy](risk-and-approval-policy.md#5-recording-decisions)) | Plan and PR (by reference) |
| Dispatch | Implementation Handoff (section 3) | Implementation (IMP) |
| Implementation + verification (IMP/VER) | Return Handoff (section 4) | Review (REV) |
| Reviews (REV/RGR/DOC) | [Review Findings](review-contract.md#52-finding-format) | Correction loop; PR summary |
| Full validation (VAL) | [Validation Evidence](validation-evidence.md#5-artifact-format-validation-evidence) | PR preparation |
| PR preparation (PRP) | [PR Summary](completion-contract.md#3-artifact-format-pr-summary) | Human review and merge |
| Release readiness (REL) | [Release-Readiness Summary](completion-contract.md#4-artifact-format-release-readiness-summary) | Maintainer release execution |

Rules:

1. **Self-containment.** A consumer must be able to act from the artifact
   plus the repository alone — no reliance on the producer's chat context,
   memory, or session state. If a fact matters downstream, it is in the
   artifact.
2. **Reference, don't restate.** Artifacts link upstream artifacts and
   decisions by reference; duplicated content drifts.
3. **One accountable primary per stage** (target operating model section 4);
   the producer of an artifact owns its correctness.
4. **Write access is exceptional.** Only the feature implementer (within a
   handoff's allowed file set) and the test engineer (test execution, test
   code) write; every other role is read-only.
5. **Sequential by default.** Parallel handoffs are limited to high-risk
   read-only investigation, plus the read-heavy fan-out and (authorized but
   not yet exercised) write-parallel modes defined by the coordination
   contract in [controlled-multi-agent-parallelism.md](controlled-multi-agent-parallelism.md)
   (Phase 9).
6. **Where artifacts live.** In the issue, the PR description/comments, or a
   scratch file that does not get committed — except artifacts this contract
   or the completion contract require in the PR itself. Artifacts are plain
   Markdown; a human with an editor can produce every one of them.

## 3. Artifact format: Implementation Handoff

One handoff per bounded task; the implementer must be able to start from
this plus the repository.

```markdown
## Implementation Handoff

- Task: <plan ref>#T<n> — <title>
- Goal: <one sentence>
- Classification: <class>  Approval: <not required | decision ref>

### Allowed files

| Path | Status |
| ---- | ------ |
| <path> | canonical |
| <path> | generated — rebuild output only, never edit |

### Prohibited

- Any file outside the allowed set (scope expansion goes back to the planner)
- Hand-editing AGENTS.md, CLAUDE.md, .claude/agents/*.md, agentquilt.lock
- New dependencies, destructive git operations, pushing, publishing
- <task-specific prohibitions>

### Required verification

- Run: <exact commands from the authoritative set>
- Add tests: <what must be covered>
- Rebuild: yes/no (`npx agentquilt build` then `npx agentquilt check`)

### Done criteria

- <checkable statements from the plan>

### Context

- Investigation: <ref + the specific findings this task relies on>
- Notes: <constraints, ordering, gotchas>
```

## 4. Artifact format: Return Handoff (implementer to reviewer)

```markdown
## Return Handoff

- Task: <handoff ref>  Commits: <shas>
- What changed: <summary per file, one line each>
- Focused verification: <command + exit code + key results>
- Deviations from the handoff: <none | what and why>
- Generated files changed: <file: causing source change | none>
- Fixtures changed: <fixture: root cause | none>
- New risks or discoveries: <anything the plan did not anticipate>
- Suggested review focus: <where the risk is>
```

## 5. Entry and exit criteria

- A handoff is dispatchable when: its plan task meets the
  [bounded-task definition](implementation-plan-contract.md#2-bounded-task-definition),
  approvals it depends on are recorded, and prior tasks it depends on have
  accepted return handoffs.
- A return handoff is acceptable when: done criteria are met, focused
  verification passed, deviations are recorded, and the generated/fixture
  sections are answered. An unexplained deviation or diff sends the task
  back, not forward.
