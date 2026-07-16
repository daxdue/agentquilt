---
name: implement-task
description: "Execute exactly one approved bounded task from an Implementation Handoff, run its focused verification, and produce a Return Handoff for review. Use when an agent needs to: (1) implement one approved task from a plan, (2) run focused tests after a bounded change, (3) fix an accepted review finding as a correction task, or (4) rebuild generated files after editing their source fragments. Delegates implementation and focused verification to the feature-implementer custom agent. Never starts without a handoff; never expands scope beyond the handoff's allowed file set; never hand-edits a generated file."
---

# Implement Task

Stage: IMP (implementation) + VER (focused verification), reused for COR
(correction), per `.docs/agentic-sdlc/lifecycle.md` and
`.docs/agentic-sdlc/handoff-contract.md`.

## When to use this skill

Use once an Implementation Plan exists and the Maintainer has approved it
(when approval was required), for exactly one bounded task's Implementation
Handoff at a time. Also reused, unmodified in procedure, for the correction
loop (COR) when a review finding needs a fix -- the "handoff" in that case
is the finding plus its proposed verification method, treated the same way.

Before proceeding: note the current branch and working-tree cleanliness
(`git status`, `git branch --show-current`), and keep the canonical-vs-
generated file distinction in view throughout (`AGENTS.md`, `CLAUDE.md`,
`.claude/agents/*.md`, and `agentquilt.lock` are rebuild outputs only; their
sources live under `.agentquilt/`).

## Steps

1. **Confirm entry criteria.** A dispatchable Implementation Handoff must
   exist (`.docs/agentic-sdlc/handoff-contract.md` section 5). If it does
   not -- for example, this skill was invoked standalone with only a vague
   task description -- stop and say so; do not invent a handoff.
2. **Delegate implementation.** Delegate to the `feature-implementer` custom
   agent (`sandbox_mode = "workspace-write"`) with the Implementation
   Handoff verbatim. This agent confirms the canonical-vs-generated status
   of every allowed file before editing, and never touches a file outside
   the handoff's allowed set.
3. **Rebuild generated files if fragments changed.** If the task edited any
   fragment under `.agentquilt/agents/project/` or any other AgentQuilt
   source, the same `feature-implementer` turn runs `agentquilt build`
   immediately after the fragment edit -- the generated file itself
   (`AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`) is never hand-edited.
4. **Run focused verification (VER).** As part of the same
   `feature-implementer` turn, run the task's focused verification: the
   authoritative commands relevant to the change, including `npx
   agentquilt check` whenever fragments, manifests, config, or generated
   files were touched.
5. **Assemble the Return Handoff.** Format:
   `.docs/agentic-sdlc/handoff-contract.md` section 4. Record deviations
   from the plan explicitly; do not omit a deviation to make the handoff
   look cleaner.

## Output

The diff plus a Return Handoff, self-contained per
`.docs/agentic-sdlc/handoff-contract.md` section 2.

## Never

- Never starts without a plan and a dispatchable handoff.
- Never touches a file outside the handoff's allowed set -- scope expansion
  goes back to the planner (`plan-change` skill / `implementation-planner`
  custom agent), it is never self-authorized inside this skill.
- Never hand-edits a generated file (`AGENTS.md`, `CLAUDE.md`,
  `.claude/agents/*.md`, `agentquilt.lock`) -- always edit the source
  fragment and rebuild.
- Never adds a dependency, runs a destructive git operation, pushes, or
  publishes.
- Never reviews its own work -- independent review is the `review-tree`
  skill's job, invoked separately.
