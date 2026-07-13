---
description: "Assemble and print the Release-Readiness Summary for main's current state. Never bumps versions, tags, or publishes."
argument-hint: "[proposed-version-bump-type]"
---

# Release Readiness

Stage: REL (release readiness), per
[completion-contract.md](../../.docs/agentic-sdlc/completion-contract.md).

**Argument (optional):** a proposed semver bump type (`major`, `minor`, or
`patch`) to check compatibility against: "$ARGUMENTS"

## What this command does

Operates on `main`'s current state (not a feature branch) and assembles the
evidence that a release is or is not safe to execute.

Before proceeding: note the current branch and working-tree cleanliness
(`git status`, `git branch --show-current`), and keep the canonical-vs-
generated file distinction in view throughout (`AGENTS.md`, `CLAUDE.md`,
`.claude/agents/*.md`, and `agentquilt.lock` are rebuild outputs only; their
sources live under `.agentquilt/`).

## Steps

1. **Delegate assembly.** Delegate to the `release-reviewer` agent to assemble
   the Release-Readiness Summary
   ([format](../../.docs/agentic-sdlc/completion-contract.md#4-artifact-format-release-readiness-summary)),
   consuming: `CHANGELOG.md` completeness and categorization,
   `packages/agentquilt-cli/package.json`'s current version against the
   proposed bump (if an argument was given), `policies/risks/risk-register.yaml`
   status, and the most recent Validation Evidence for `main`.
2. **Print the verdict.** Output READY or NOT READY, with every blocker named
   explicitly if NOT READY, plus the summary's own "Remaining human steps"
   line.

## Absolute rule

This command **never** bumps the version, tags, or publishes. Those are the
Maintainer's own steps per
[release-process.md](../../.docs/sdlc/release-process.md), always listed in
the summary's "Remaining human steps" line, never performed by this command.

## Never

- Never bumps `packages/agentquilt-cli/package.json`'s version.
- Never runs `git tag`, `npm publish`, `npm version`, or `gh release`.
- Never declares READY while a known blocker (failing deterministic check,
  unresolved BLOCKER/HIGH review finding, incomplete CHANGELOG entry, open
  high-severity risk-register item) is outstanding.
