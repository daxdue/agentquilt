# Branching Strategy

## Overview

AgentQuilt uses a trunk-based development model with feature branches and protection rules on `main`. All merges require passing CI and human review.

## Branch Naming

Follow the convention defined in [CONTRIBUTING.md](../../CONTRIBUTING.md):

- **`feature/<short-description>`** — New capability or feature
- **`fix/<short-description>`** — Bug fix
- **`docs/<short-description>`** — Documentation, guides, examples
- **`refactor/<short-description>`** — Code refactoring, no behavior change
- **`agent/<agent-name>-<change>`** — Agent-specific changes (manifest or blocks)

Examples:
```
feature/agent-adapter-registry
fix/normalization-crlf-handling
docs/v1-spec-clarification
refactor/extract-fragment-scanner
agent/governance-add-policy-review-block
```

## Main Branch Protection

- **`main`** is the stable release branch
- All changes require:
  1. A PR from a feature branch
  2. Passing CI (tests, linting, drift check)
  3. At least one human approval (code review)
  4. No outstanding change requests

## Merge Policy

- Use **squash merges** for feature branches to keep git history clean and atomic
  - Commit message follows the format from [CONTRIBUTING.md](../../CONTRIBUTING.md): `<type>(<scope>): <summary>`
- Create a merge commit if the branch contains multiple logical steps worth preserving in history (rare)
- Never merge directly to `main` without PR

## Release Branches (Deferred)

Release branch strategy is deferred until v1 stabilizes. At that point:

- Create `release/v<major>.<minor>` branches for maintenance releases
- Backport critical fixes from `main` via cherry-pick or manual merge
- Tag releases on the release branch with `v<major>.<minor>.<patch>`

See [Release Process](.docs/sdlc/release-process.md) for details (when finalized).

## Key Files Protected from Direct Edits

The following **generated files** must never be manually edited and will only change via `agentquilt build`:

- `agentquilt.lock` — Fragment and target version matrix
- `AGENTS.md` — Generated target output
- `.claude/agents/*.md` — Generated Claude sub-agent definitions
- `.codex/agents/*.toml` — Generated Codex configurations (if applicable)

Any manual edit to these files will be caught by `agentquilt check` in CI and fail the build.

## Drift Detection

Run `agentquilt check` to verify that committed generated files match the current source state. This runs automatically in CI on every PR to catch:

- Forgotten `agentquilt build` after editing a fragment or manifest
- Merge conflicts in generated files (which should be regenerated, not resolved)
- Stale locks from concurrent PRs

If drift is detected, regenerate with `agentquilt build` and commit the result in a new commit (not amended into prior commits).
