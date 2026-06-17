# ADR-0001: Project Structure

## Status

Accepted

## Context

AgentQuilt needs to support CLI source code, schemas, documentation, examples, policies, and future internal agents. The repository must be understandable for contributors and suitable for CI/CD validation.

## Decision

Use a repository structure with dedicated top-level directories:

- `packages/` for implementation packages
- `schemas/` for schema definitions
- `examples/` for example agents
- `docs/` for documentation
- `policies/` for gate and risk policies
- `.github/` for GitHub workflows and templates

## Consequences

Positive:

- Clear separation of concerns
- Easier onboarding
- Easier CI targeting
- Scalable structure for future packages

Negative:

- Slightly more structure than needed for the earliest MVP
- Requires documentation discipline