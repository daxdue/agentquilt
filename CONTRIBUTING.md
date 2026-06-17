# Contributing to AgentQuilt

## Development Principles

1. Structured source files are the source of truth.
2. Generated Markdown files must not be manually edited.
3. All significant decisions must be documented as ADRs.
4. Every behavior-changing change must be testable.
5. AI assistance is allowed, but human review is required.

## Branch Naming

Use:

- `feature/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`
- `refactor/<short-description>`
- `agent/<agent-name>-<change>`

Examples:

- `feature/instruction-block-schema`
- `docs/add-architecture-overview`
- `agent/qa-coach-release-readiness`

## Commit Message Format

Recommended:

`<type>(<scope>): <summary>`

Examples:

- `docs(architecture): add project structure ADR`
- `feat(schema): define agent manifest format`
- `feat(cli): add compile command`
- `test(compiler): add golden-file test`

## Pull Request Expectations

Each PR should include:

- Clear summary
- Change type
- Risk level
- Validation performed
- Affected components
- Expected behavior change, if any

## Generated Files Policy

Generated files must not be manually edited. If generated output changes, regenerate it using the appropriate command once the CLI exists.

## ADR Policy

Create an ADR when a change affects:

- Architecture
- Source format
- Generated artifact policy
- CI gates
- Security model
- Eval strategy
- Release process