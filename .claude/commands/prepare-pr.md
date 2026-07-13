---
description: "Assemble and print the PR Summary from this session's already-produced artifacts. Never pushes or opens a PR."
argument-hint: "[issue-or-pr-reference]"
---

# Prepare PR

Stage: PRP (PR-ready report), per
[completion-contract.md](../../.docs/agentic-sdlc/completion-contract.md).

**Argument (optional):** an issue or PR reference: "$ARGUMENTS"

## What this command does

Gathers the Task Classification, Implementation Plan (with its approval
reference), Review Findings (with resolutions), and Validation Evidence
already produced earlier in this session, and assembles them into the PR
Summary format.

## Steps

1. **Gather artifacts already produced this session.** Do not re-derive them
   from scratch and do not invoke `analyze-issue`, `plan-change`,
   `implement-task`, or `review-tree` from inside this command -- if any of
   those artifacts are missing, say so plainly and stop; the Maintainer should
   run the missing stage first (for example via the `develop-issue` skill),
   not have this command silently fill the gap with guesses.
2. **Delegate assembly.** Delegate to the `feature-implementer` agent to
   assemble the PR Summary
   ([format](../../.docs/agentic-sdlc/completion-contract.md#3-artifact-format-pr-summary)):
   what and why, plan (standard and above), tests executed, generated-output
   changes, fixture/golden changes, compatibility and docs impact, review
   findings and resolutions (standard and above), limitations and follow-ups.
3. **Print the summary text.** Output the assembled PR Summary directly in
   this command's response, ready for the Maintainer to use verbatim or edit.

## Absolute rule

This command **never** runs `git push`, `gh pr create`, or any merge or
publish action, under any circumstance, with no confirmation-based exception.
It only assembles and prints text. Pushing and opening the PR are the
Maintainer's own separate, explicit actions
([risk-and-approval-policy.md section 2](../../.docs/agentic-sdlc/risk-and-approval-policy.md#2-absolute-rules-no-exceptions-any-profile),
rule 1 -- unconditional, not "ask before pushing").

## Never

- Never runs `git push`, `git commit` on the Maintainer's behalf without prior
  request, `gh pr create`, `gh pr merge`, or any release/publish action.
- Never invents review findings, test results, or plan content not already
  produced this session.
- Never omits a known limitation or unresolved finding to make the summary
  look cleaner.
