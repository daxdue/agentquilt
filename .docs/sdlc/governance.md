# Governance

## Overview

AgentQuilt is a pre-release open-source project. Governance covers three areas: decision authority, AI assistance rules, and contribution review.

---

## Decision Authority

| Decision Type | Who Decides | Process |
|---|---|---|
| Architecture, source format, CI gates | Core maintainers | ADR required (see [ADR policy](../../CONTRIBUTING.md)) |
| Bug fixes, documentation | Any contributor | PR + one approval |
| Release cut | Core maintainers | Release gate G6 must pass (see [gates.md](gates.md)) |
| Security issues | Core maintainers | Private disclosure → patch → coordinated release |

**AI agents** (including AgentQuilt's own meta-agents) may draft, recommend, and prepare changes. They may **not** approve PRs, merge, cut releases, or bypass any gate. See [ADR-0004](../architecture/adr/ADR-0004-ai-assistance-authority-model.md).

---

## Code Ownership

Ownership is defined in [CODEOWNERS](../../CODEOWNERS). Team names are placeholders until a GitHub organization is established. Until then, all reviews route to `@core-maintainers`.

---

## ADR Policy

An Architecture Decision Record is required for any change that affects:

- Project structure or directory layout
- Source format (manifest or block schema)
- Generated artifact policy
- CI gates
- Security model
- Eval strategy
- Release process
- CLI command names or binary name

ADRs live in `.docs/architecture/adr/`. Use the existing ADRs (ADR-0001 through ADR-0009) as format references. A new ADR must be included in the same PR as the change it documents.

---

## Branching and Merge Policy

See [branching-strategy.md](branching-strategy.md) for branch naming conventions. All merges to `main` require:

1. CI passing (all gates in test.yml)
2. At least one human approval (not AI-generated)
3. No unresolved review comments

Squash merge is the default. Merge commits are allowed for multi-commit feature histories where preserving the commit graph has review value.

---

## Pre-release Phase Constraints

Until v1.0.0 ships:

- Breaking changes to the manifest format or CLI commands require an ADR but not a deprecation period
- The lock file format may change with a minor version bump
- No SLA on issue response time

See [lifecycle.md](lifecycle.md) for the full pre-release phase policy.
