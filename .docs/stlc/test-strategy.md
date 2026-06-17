# AgentQuilt Test Strategy

## Purpose

AgentQuilt requires two testing layers:

1. Traditional software testing for CLI/framework correctness.
2. Agent behavior testing for generated prompt correctness.

## Test Levels

### Unit Tests

Validate individual functions:

- YAML loading
- Schema validation
- Block sorting
- Markdown rendering
- Diff logic
- CLI exit codes

### Integration Tests

Validate command-level behavior:

- `agentquilt validate`
- `agentquilt lint`
- `agentquilt compile`
- `agentquilt compile --check`
- `agentquilt diff`
- `agentquilt test`

### Golden-File Tests

Validate deterministic generated Markdown.

Input:

- Manifest
- Instruction blocks

Expected output:

- Generated Markdown file

### Eval Tests

Validate expected agent behavior.

Examples:

- Required concepts are present
- Forbidden behavior is absent
- Output format is followed
- Safety boundaries are preserved

### Security Tests

Validate:

- Prompt injection resistance
- Suspicious instruction patterns
- Generated artifact tampering
- Secret leakage risks
- Dependency vulnerabilities

## Regression Strategy

Every behavior-changing change should either:

- Pass existing evals
- Add new evals
- Update evals with explicit justification

## Test Evidence

CI should produce:

- Test results
- Eval results
- Compile check result
- Security scan result