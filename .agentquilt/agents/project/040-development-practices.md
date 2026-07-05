## Development Practices

### Branch Naming

From [CONTRIBUTING.md](CONTRIBUTING.md):

```
feature/<short-description>     # New capability
fix/<short-description>         # Bug fix
docs/<short-description>        # Documentation
refactor/<short-description>    # Refactoring
agent/<agent-name>-<change>     # Agent-specific changes
```

### Commit Message Format

Recommended: `<type>(<scope>): <summary>`

Examples:
```
feat(schema): define agent manifest format
feat(compiler): implement deterministic Markdown generation
test(compiler): add golden-file validation tests
docs(architecture): add project structure ADR
```

### Pull Request Expectations

Each PR must include:
- Clear summary
- Change type (feature, fix, docs, refactor, etc.)
- Risk level (low/medium/high)
- Validation performed
- Affected components
- Expected behavior change (if any)

### Generated Files Policy

Generated files (`agentquilt.lock`, `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`) must **never** be manually edited. `AGENTS.md` and `CLAUDE.md` are compiled from the fragments under `.agentquilt/agents/project/` — edit those fragments and regenerate with `npx agentquilt build`. Changes to generated files should only come from manifest or block changes.

**Strict Rule for AGENTS.md and CLAUDE.md:**
- NO emojis (check marks, crosses, rockets, clipboards, etc.)
- NO smileys or emoticons
- NO pictographic symbols
- Use plain text only: `[OK]` for status, `READY` for availability, `WARNING` for caution
- Automatically enforced: adapter layer strips all emojis and emoticons during generation
- See [Emoji Policy](.docs/EMOJI_POLICY.md) for details and migration guide

### ADR Policy

Create an ADR when a change affects:
- Architecture
- Source format (manifest or block structure)
- Generated artifact policy
- CI gates
- Security model
- Eval strategy
- Release process

See [ADRs](.docs/architecture/adr/) for examples.
