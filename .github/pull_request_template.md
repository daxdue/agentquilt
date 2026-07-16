## Summary

Describe what changed and why.

## Linked issue

Closes #___ / Relates to #___

## Task classification

Classification from CLS (analyze-issue / implementation-planner): small / standard / high-risk.

## Approved plan or rationale

Link to the Implementation Plan artifact if this went through the `plan-change` approval gate,
or a one-line rationale for why a small task skipped formal planning.

## Change Type

<!-- Do not use "- [ ]" checkbox syntax anywhere in this template -- GitHub
     renders it as a task list and shows a "N of M tasks" progress badge on
     the PR, which is misleading (these are classification tags, not TODOs).
     Instead, fill in "Selected: ..." below. -->

Options: Documentation, Schema, CLI / Code, Agent instruction, Eval, Gate / Policy, Security, Release

Selected:

## Risk Level

Options: Low, Medium, High, Critical

Selected:

## Affected Areas

Options: CLI, Schemas, Compiler, Adapters (Claude / AgentSkills), Evals, Generated agents, Documentation, CI/CD, Security / Governance

Selected:

## Implementation summary

What was actually built. Distinct from Summary above -- this is the "what happened," not the "why."

## Design decisions

Notable choices made during implementation and why. (See `review-tree`'s Review Findings artifact
and the Implementation Handoff for the fuller upstream record; this is a summary, not a
re-specification.)

## Tests executed

List each command run and its outcome (mirrors the phase-report `checks_run` convention used
elsewhere in this repository):

- `command` -- result

## Generated-output changes

Yes / No. If yes: which targets (`AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`,
`agentquilt.lock`), and confirmation that `agentquilt build` produced them (never hand-edited).

## Fixture or snapshot explanation

Yes / No. If yes: root-cause explanation for the fixture/golden-file change (an unexplained diff
is a BLOCKER finding at review).

## Compatibility impact

Breaking or non-breaking, and why.

## Documentation impact

What documentation was updated, or why nothing needed to change.

## Review findings and resolution

Finding | Severity | Resolution
------- | -------- | ----------

## Limitations

Known gaps left by this change.

## Follow-up work

Deferred items, if any.

## Validation

Options: Tests added or updated, Documentation updated, ADR added or updated if needed, Generated files updated if applicable, Backward compatibility considered, Security impact considered

Selected:
