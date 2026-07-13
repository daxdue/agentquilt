---
name: release-readiness
description: "Assemble and print the Release-Readiness Summary for main's current state. Never bumps versions, tags, or publishes. Explicit invocation only ($release-readiness) -- this skill does not auto-trigger."
---

# Release Readiness

Stage: REL (release readiness), per
`.docs/agentic-sdlc/completion-contract.md`.

## What this skill does

Delegates to the `release-reviewer` custom agent to assemble the
evidence that a release is safe to execute: CHANGELOG completeness and
categorization, semver compliance of the version bump, migration notes for
breaking changes, risk register status, validation evidence and drift-check
state.

## Steps

1. **Delegate to release-reviewer.** Delegate to the `release-reviewer`
   custom agent (`sandbox_mode = "read-only"`) for the Release-Readiness
   Summary (format: `.docs/agentic-sdlc/completion-contract.md` section 4).
   This agent consumes already-produced Validation Evidence rather than
   re-running checks, keeping it strictly read-only.
2. **Print the verdict.** Output the assembled Release-Readiness Summary
   directly in this session's response, with every blocking item named
   explicitly.

## Absolute rule

This skill **never** publishes, tags, pushes, or bumps a version, under
any circumstance. It only assembles and prints the readiness evidence.
Executing the release is the Maintainer's own separate, explicit action
(`.docs/sdlc/release-process.md`).

## Invocation policy

This skill's `agents/openai.yaml` sets `policy.allow_implicit_invocation:
false`. It only starts on deliberate explicit invocation
(`$release-readiness`), never ambient description-triggered invocation,
for the same reason `prepare-pr` is explicit-only: it is adjacent to the
absolute no-publish/no-tag/no-version-bump rule and should never fire
mid-conversation without the Maintainer explicitly asking for it.

## Never

- Never publishes, tags, pushes, or bumps a version.
- Never edits the CHANGELOG or the risk register -- proposed text is
  printed as a suggestion only.
- Never invents evidence not already present in the repository's CHANGELOG,
  risk register, or prior Validation Evidence artifacts.
