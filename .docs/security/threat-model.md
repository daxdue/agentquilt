# AgentQuilt Threat Model

## Assets

- Agent source files
- Generated Markdown prompts
- Eval cases
- Gate policies
- Release artifacts
- CI configuration
- Package artifacts

## Threats

### Manual Generated File Tampering

A developer manually edits generated Markdown and bypasses structured source files.

Mitigation:

- Generated file header
- Compile check in CI
- Review policy

### Prompt Injection Through Instruction Blocks

A malicious or accidental instruction block introduces unsafe behavior.

Mitigation:

- Instruction lint rules
- Security review for high-risk blocks
- Safety evals

### Schema Poisoning

Schema changes weaken validation rules.

Mitigation:

- Schema owner review
- Schema tests
- Migration notes

### Eval Poisoning

Eval changes hide a regression.

Mitigation:

- Eval review
- Eval change summary
- Risk classification

### Supply Chain Risk

Dependencies introduce vulnerabilities.

Mitigation:

- Dependency scanning
- Lockfile review
- Release checks