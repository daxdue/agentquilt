---
name: analyze-issue
description: "Classify the risk of an issue or user request and produce an evidence-backed Repository Investigation before any planning or implementation starts. Use when an agent needs to: (1) analyze an issue, PR description, or free-text change request, (2) classify a task as small, standard, or high-risk, (3) investigate which repository components a change would touch before planning it, or (4) determine whether acceptance criteria are testable before proceeding. Delegates classification to the implementation-planner custom agent, ambiguity detection to the ambiguity-detector custom agent when criteria are unclear, and investigation to the repository-explorer custom agent (parallel instances for high-risk scope). Read-only: never edits, never implements."
---

# Analyze Issue

Stage: CLS (task classification) + INV (repository investigation), per
`.docs/agentic-sdlc/lifecycle.md` and
`.docs/agentic-sdlc/task-classification.md`.

## When to use this skill

Use this at the start of any change: a GitHub issue, a PR description, or a
free-text request from the Maintainer. This is the entry point for the
`standard-development` skill (see that skill's steps 1-2) and can also be
invoked standalone when only classification and investigation are needed,
without continuing to planning or implementation.

## Steps

1. **Record a Task Classification.** Delegate to the `implementation-planner`
   custom agent (or perform this step directly if the request is trivially
   small and delegation would add no value) to produce a Task Classification
   per `.docs/agentic-sdlc/task-classification.md` section 3. Check every
   high-risk trigger in section 2.1 and every small-profile criterion in
   section 2.2 explicitly; do not skip triggers because the change "looks
   small."
2. **Check acceptance criteria testability.** If the issue's acceptance
   criteria are missing, subjective, or unfalsifiable, delegate to the
   `ambiguity-detector` custom agent before proceeding further. Do not guess
   at what "done" means on the Maintainer's behalf.
3. **Delegate repository investigation.** Delegate to the
   `repository-explorer` custom agent for the Repository Investigation
   (format: `.docs/agentic-sdlc/investigation-contract.md` section 4):
   - Small profile: a light investigation (affected files only).
   - Standard profile: a full investigation (affected components,
     canonical-vs-generated status of every file that may be touched, test
     and doc surface, constraint checks).
   - High-risk profile: multiple parallel `repository-explorer` instances on
     genuinely disjoint questions, one batch of calls. Never overlapping
     questions in the same batch.

## Output

A Task Classification and a Repository Investigation, both self-contained
per `.docs/agentic-sdlc/handoff-contract.md` section 2. Hand these to the
`plan-change` skill next, or directly to `implement-task` only in the small
profile per the lifecycle's small-change path.

## Never

- Never implements, edits, or writes any file. This skill and every custom
  agent it delegates to in these steps (`implementation-planner`,
  `ambiguity-detector`, `repository-explorer`) run with `sandbox_mode =
  "read-only"`.
- Never downgrades a classification once triggers are found -- agents never
  downgrade; only the Maintainer can (`.docs/agentic-sdlc/
  task-classification.md` section 4).
- Never treats a generated file (`AGENTS.md`, `CLAUDE.md`,
  `.claude/agents/*.md`, `agentquilt.lock`) as anything other than generated
  in the investigation's canonical-vs-generated accounting.
