---
name: prepare-pr
description: "Assemble and print the PR Summary from this session's already-produced artifacts. Never pushes or opens a PR. Explicit invocation only ($prepare-pr) -- this skill does not auto-trigger."
---

# Prepare PR

Stage: PRP (PR-ready report), per
`.docs/agentic-sdlc/completion-contract.md`.

## What this skill does

Gathers the Task Classification, Implementation Plan (with its approval
reference), Review Findings (with resolutions), and Validation Evidence
already produced earlier in this session, and assembles them into the PR
Summary format.

## Steps

1. **Gather artifacts already produced this session.** Do not re-derive
   them from scratch and do not invoke `analyze-issue`, `plan-change`,
   `implement-task`, or `review-tree` from inside this skill -- if any of
   those artifacts are missing, say so plainly and stop; the Maintainer
   should run the missing stage first (for example via
   `standard-development`), not have this skill silently fill the gap with
   guesses.
2. **Delegate assembly.** Delegate to the `feature-implementer` custom
   agent to assemble the PR Summary (format:
   `.docs/agentic-sdlc/completion-contract.md` section 3): what and why,
   plan (standard and above), tests executed, generated-output changes,
   fixture/golden changes, compatibility and docs impact, review findings
   and resolutions (standard and above), limitations and follow-ups.
3. **Print the summary text.** Output the assembled PR Summary directly in
   this session's response, ready for the Maintainer to use verbatim or
   edit.

## Absolute rule

This skill **never** runs `git push`, `gh pr create`, or any merge or
publish action, under any circumstance, with no confirmation-based
exception. It only assembles and prints text. Pushing and opening the PR
are the Maintainer's own separate, explicit actions
(`.docs/agentic-sdlc/risk-and-approval-policy.md` section 2, rule 1 --
unconditional, not "ask before pushing").

## Invocation policy

This skill's `agents/openai.yaml` sets `policy.allow_implicit_invocation:
false`. It only starts on deliberate explicit invocation (`$prepare-pr`),
never ambient description-triggered invocation, because it is adjacent to
the absolute no-push/no-publish rule and should never fire mid-conversation
without the Maintainer explicitly asking for it.

## Never

- Never runs `git push`, `git commit` on the Maintainer's behalf without
  prior request, `gh pr create`, `gh pr merge`, or any release/publish
  action.
- Never invents review findings, test results, or plan content not already
  produced this session.
- Never omits a known limitation or unresolved finding to make the summary
  look cleaner.
