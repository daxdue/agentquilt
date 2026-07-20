# Agentic SDLC — Investigation Contract

Date: 2026-07-12
Status: Active (Phase 2 deliverable of the agentic SDLC effort)

## 1. Purpose and when it applies

Investigation produces the evidence base for everything downstream: the
plan, the implementation handoffs, and the reviews. It runs in every profile
(light in small, full in standard, parallel-capable in high-risk). Adjacent
stages: consumes the [task classification](task-classification.md); feeds
[planning](implementation-plan-contract.md) (standard/high-risk) or directly
the single implementation task (small).

## 2. Rules

1. **Read-only.** The investigating role (repository analyst) edits nothing,
   runs no state-changing commands, and proposes no final decisions.
2. **Every claim carries evidence**: a repository path (plus line, symbol,
   or commit where it matters). Claims without evidence are labeled
   `inference` and listed separately from findings.
3. **Canonical-vs-generated status is mandatory** for every file the change
   might touch. Generated files (`AGENTS.md`, `CLAUDE.md`,
   `.claude/agents/*.md`, `agentquilt.lock`) are never edit targets; the
   investigation names their canonical source (fragments under
   `.agentquilt/`, config) instead. See the canonical/generated table in the
   [current-state audit](current-state-audit.md) section 1.
4. **Test and fixture surface is mandatory**: which unit/integration/golden
   tests cover the affected area (under `packages/agentquilt-cli/tests/`),
   and which fixtures or golden expectations could be affected — because
   fixture changes are approval-relevant
   ([risk-and-approval-policy section 6](risk-and-approval-policy.md#6-baseline-and-snapshot-changes)).
5. **Constraint check**: does the area involve deterministic-compilation
   guarantees (normalization, hashing, ordering), schemas
   (`schemas/*.schema.json`, Zod), public CLI behavior/exit codes, or
   backward compatibility? Each yes must appear as a finding, since each
   maps to a classification trigger.
6. **Bounded**: investigate the questions the task raises, not the whole
   repository. Unresolved questions are recorded as unknowns, not guessed.
7. **Parallel investigation (high-risk only)**: multiple read-only analysts
   may investigate disjoint question sets; the planner merges their
   artifacts and owns conflict resolution between them.

## 3. Minimum investigation by profile

| Profile | Minimum |
| ------- | ------- |
| Small | Locate the defect/change site; confirm canonical status; name the covering test(s); confirm no trigger applies. May be a few lines — but still evidence-backed. |
| Standard | Full artifact (section 4). |
| High-risk | Full artifact plus explicit compatibility and persisted-format findings; parallel investigations merged. |

## 4. Artifact format: Repository Investigation

```markdown
## Repository Investigation

- Task: <ref>
- Classification under test: <class> (confirm or challenge)
- Questions investigated:
  1. <question>

### Findings

| # | Finding | Evidence (path:line / symbol / commit) |
| - | ------- | -------------------------------------- |
| 1 | <fact>  | <path> |

### Affected components

| Path | Canonical or generated (source if generated) | Covered by tests |
| ---- | -------------------------------------------- | ---------------- |

### Constraints found

- Deterministic output: <yes/no + which guarantee>
- Schemas / persisted formats: <yes/no + which>
- Public CLI behavior / exit codes: <yes/no + which>
- Backward compatibility: <yes/no + what must keep working>
- Fixtures / golden files potentially affected: <list or none>

### Inferences (not evidence-backed)

- <inference and why it is plausible>

### Unknowns and risks

- <open question; what would resolve it>

### Classification confirmation

- Recommended class: <class> — <reason if different from input>
```

## 5. Exit criteria

The investigation is complete when: every question has a finding or a
recorded unknown; the affected-components table has no blank
canonical/generated cells; the constraints section is answered; and the
classification is confirmed or a reclassification is recommended with
evidence.
