# AgentQuilt SDLC Lifecycle

## Lifecycle Stages

1. Intake
2. Requirements
3. Architecture
4. Implementation
5. Verification
6. Release
7. Post-release review

## Stage 1: Intake

Purpose:

Capture the problem, expected value, owner, and initial risk.

Required artifacts:

- Feature brief
- Owner
- Risk level
- Initial acceptance criteria

## Stage 2: Requirements

Purpose:

Convert the idea into testable requirements.

Required artifacts:

- Requirement IDs
- Acceptance criteria
- Non-functional requirements
- Traceability links

## Stage 3: Architecture

Purpose:

Define the technical approach.

Required artifacts:

- Architecture notes
- ADR if needed
- Affected components
- Testing impact
- Security impact

## Stage 4: Implementation

Purpose:

Implement code, schemas, docs, policies, or agent changes.

Required artifacts:

- Pull request
- Tests
- Updated docs if needed

## Stage 5: Verification

Purpose:

Validate correctness and behavior.

Required evidence:

- Unit tests
- Integration tests
- Golden-file tests
- Agent evals where applicable
- Security checks where applicable

## Stage 6: Release

Purpose:

Package and publish a version with evidence.

Required artifacts:

- Changelog
- Release notes
- Test summary
- Eval summary
- Migration notes if needed

## Stage 7: Post-release Review

Purpose:

Review feedback, incidents, defects, and process gaps.

Required artifacts:

- Lessons learned
- Follow-up backlog items