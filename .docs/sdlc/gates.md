# AgentQuilt Quality Gates

## G0 — Intake Gate

Required:

- Problem statement
- Owner
- Expected value
- Initial risk level
- Affected area

## G1 — Requirements Gate

Required:

- Testable acceptance criteria
- Requirement ID
- Non-functional requirements considered
- Traceability to tests or planned tests

## G2 — Architecture Gate

Required for non-trivial changes:

- ADR or design note
- Alternatives considered
- Testing impact
- Security impact
- Backward compatibility impact

## G3 — Implementation Gate

Required:

- Code follows project structure
- Generated files are not manually edited
- Schema changes include migration notes
- Error handling exists

## G4 — Test Readiness Gate

Required:

- Test scope defined
- Unit tests planned
- Integration tests planned
- Evals planned if agent behavior changes
- Security tests planned if high-risk

## G5 — PR Quality Gate

Required:

- Typecheck
- Unit tests
- Lint
- Compile check
- Golden-file tests
- Eval checks where applicable
- Documentation updated

## G6 — Release Gate

Required:

- All blocking checks passed
- Changelog updated
- Version updated
- Release notes created
- Migration notes included if needed
- No open critical risks

## G7 — Post-release Gate

Required:

- Release feedback reviewed
- Defects triaged
- Process gaps captured
- Backlog updated