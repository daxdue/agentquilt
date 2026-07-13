---
name: analyze-issue
description: "Classify the risk of an issue or user request and produce an evidence-backed Repository Investigation before any planning or implementation starts. When an agent needs to: (1) Analyze an issue, PR description, or free-text change request, (2) Classify a task as small, standard, or high-risk, (3) Investigate which repository components a change would touch before planning it, or (4) Determine whether acceptance criteria are testable before proceeding. Delegates classification to implementation-planner, ambiguity detection to ambiguity-detector when criteria are unclear, and investigation to repository-analyst (parallel instances for high-risk scope). Read-only: never edits, never implements."
---

# Analyze Issue

Stage: CLS (task classification) + INV (repository investigation), per
[lifecycle.md](../../../.docs/agentic-sdlc/lifecycle.md) and
[task-classification.md](../../../.docs/agentic-sdlc/task-classification.md).

## When to use this skill

Use this at the start of any change: a GitHub issue, a PR description, or a
free-text request from the Maintainer. This is the entry point for
`develop-issue` (see that skill's step 1-3) and can also be invoked standalone
when only classification and investigation are needed, without continuing to
planning or implementation.

Before proceeding: note the current branch and working-tree cleanliness
(`git status`, `git branch --show-current`), and keep the canonical-vs-
generated file distinction in view throughout (`AGENTS.md`, `CLAUDE.md`,
`.claude/agents/*.md`, and `agentquilt.lock` are rebuild outputs only; their
sources live under `.agentquilt/`).

## Steps

1. **Record a Task Classification.** Delegate to the `implementation-planner`
   agent (or perform this step directly if the request is trivially small and
   the delegation would add no value) to produce a Task Classification per
   [task-classification.md section 3](../../../.docs/agentic-sdlc/task-classification.md#3-artifact-format-task-classification).
   Check every high-risk trigger in
   [section 2.1](../../../.docs/agentic-sdlc/task-classification.md#21-high-risk-triggers)
   and every small-profile criterion in
   [section 2.2](../../../.docs/agentic-sdlc/task-classification.md#22-small-criteria)
   explicitly; do not skip triggers because the change "looks small."
2. **Check acceptance criteria testability.** If the issue's acceptance
   criteria are missing, subjective, or unfalsifiable, delegate to the
   `ambiguity-detector` agent before proceeding further. Do not guess at what
   "done" means on the Maintainer's behalf.
3. **Delegate repository investigation.** Delegate to the `repository-analyst`
   agent for the Repository Investigation
   ([format](../../../.docs/agentic-sdlc/investigation-contract.md#4-artifact-format-repository-investigation)):
   - Small profile: a light investigation (affected files only).
   - Standard profile: a full investigation (affected components, canonical-
     vs-generated status of every file that may be touched, test and doc
     surface, constraint checks).
   - High-risk profile: multiple parallel `repository-analyst` instances on
     genuinely disjoint questions (for example "map the schema impact" and
     "map the CLI compatibility impact" as separate instances), one batch of
     calls. Never overlapping questions in the same batch.

## Output

A Task Classification and a Repository Investigation, both self-contained per
[handoff-contract.md rule 1](../../../.docs/agentic-sdlc/handoff-contract.md#2-handoff-chain-and-rules).
Hand these to the `plan-change` skill next, or directly to `implement-task`
only in the small profile per the lifecycle's small-change path.

## Never

- Never implements, edits, or writes any file. This skill and every agent it
  delegates to in these steps (`implementation-planner`, `ambiguity-detector`,
  `repository-analyst`) are read-only.
- Never downgrades a classification once triggers are found -- agents never
  downgrade; only the Maintainer can
  ([task-classification.md section 4](../../../.docs/agentic-sdlc/task-classification.md#4-reclassification-rules)).
- Never treats a generated file (`AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`,
  `agentquilt.lock`) as anything other than generated in the investigation's
  canonical-vs-generated accounting.
