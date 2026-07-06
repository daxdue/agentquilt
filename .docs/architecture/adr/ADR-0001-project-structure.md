# ADR-0001: Project Structure

## Status

Accepted, Refined

## Context

AgentQuilt needs to support CLI source code, schemas, documentation, policies, and internal meta-agents. The repository must be understandable for contributors, maintainable as the project scales, and suitable for CI/CD validation.

## Decision

Use a repository structure with dedicated top-level directories:

- **`packages/`** — publishable packages (workspace)
  - `packages/agentquilt/` — the main CLI, TypeScript implementation
- **`agents/`** — user-facing agent source (fragments + manifests)
- **`.agents/`** — meta-agents: AgentQuilt's own internal agents for governance, SDLC, testing, release workflows
- **`schemas/`** — JSON Schema definitions (language-neutral reference for configuration and blocks)
- **`policies/`** — SDLC and security gate policies, risk register
- **`.docs/`** — architecture specifications, ADRs, SDLC/STLC documentation (hidden directory keeps repo root clean)
- **`.github/`** — GitHub workflows, PR/issue templates
- **`scripts/`** — utility scripts, test fixtures, spike validation
- **`.planning/`** — work breakdown, project plan (not committed to releases)

## Rationale

**`packages/` as standard monorepo:** Follows npm/Yarn/Turborepo convention. Enables npm workspaces support: one root workspace root with `"workspaces": ["packages/*"]`, shared scripts, and consistent CLI for building/testing multiple packages. Future packages (`packages/agentquilt-linter`, `packages/agentquilt-vscode`, etc.) fit naturally without restructuring.

**`.agents/` inclusion:** The framework is self-hosted—it uses its own agent definitions to drive governance, code review, testing, and release workflows. These are structurally identical to user agents but conceptually distinct (meta-agents). They validate the framework's own capabilities.

**`.docs/` (hidden) over `docs/`:** Keeps the repo root visually uncluttered. Hidden directories are still indexed by IDEs, searchable, and included in git. Reduces cognitive load for contributors scanning the root.

## Consequences

Positive:

- Clear separation of user agents, framework tools, and meta-infrastructure
- Scales to multiple tools or library packages without restructuring
- Self-hosted framework validates its own design on real use cases
- Hidden docs directory reduces visual clutter while remaining discoverable

Negative:

- Slightly more structure than the absolute minimum MVP
- Requires documentation discipline and onboarding guidance (provided in CLAUDE.md)