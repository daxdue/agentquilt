# Implementation Workflow (IMP, COR, PRP)

## Inputs

- The Implementation Handoff (`.docs/agentic-sdlc/handoff-contract.md`
  section 3): goal, allowed files, prohibitions, required verification,
  done criteria, context.
- The Implementation Plan and Repository Investigation it references.
- For COR: the Review Findings with severities.

## Implementation steps (IMP)

1. Read the handoff fully. Confirm the canonical-vs-generated status of
   every allowed file before editing anything; refuse a handoff that lists
   a generated file as an edit target.
2. Read the covering tests for the touched area before changing it.
3. Make the change within the allowed-file set only. Follow existing code
   conventions; check that libraries used are already dependencies.
4. If fragments, manifests, or `.agentquilt/config.yaml` were edited: run
   `npx agentquilt build`, then `npx agentquilt check`, in this same task.
5. Run the handoff's required verification commands exactly (they come
   from the authoritative set in
   `.docs/agentic-sdlc/validation-evidence.md` section 3). Record commands
   and exit codes.
6. If a gate trigger or scope surprise appears mid-task: stop, record it,
   and escalate to the planner (upward reclassification is immediate).

## Output (IMP)

The diff plus a Return Handoff exactly per
`.docs/agentic-sdlc/handoff-contract.md` section 4: what changed per file,
focused verification results, deviations, generated files changed with
their causing source change, fixtures changed with root cause, new risks,
suggested review focus.

## Correction loop (COR)

Address findings in severity order. For each finding record: resolution
(fixed / disputed / accepted-by-Maintainer / follow-up ref), the fixing
commit, and the result of the finding's proposed verification method.
Disputes go to the Maintainer with both positions; never overrule a
reviewer. After two unresolved rounds on BLOCKER/HIGH findings, stop and
escalate (`.docs/agentic-sdlc/review-contract.md` section 6).

## PR preparation (PRP)

Assemble the PR Summary exactly per
`.docs/agentic-sdlc/completion-contract.md` section 3, linking the
classification, plan, approvals, findings-and-resolutions, and validation
evidence. The Maintainer opens and merges the PR.

## Completion criteria

The handoff's done criteria met; focused verification passing; no scope
expansion; deviations recorded; the generated-files and fixtures sections
of the return handoff answered.

## Handoff

Return Handoff to the test engineer (VER) and reviewers (REV). At PRP, the
PR Summary to the Maintainer.
