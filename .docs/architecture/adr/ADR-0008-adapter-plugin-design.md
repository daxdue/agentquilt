# ADR-0008: Platform Adapter Plugin Design

## Status

Accepted

## Context

AgentQuilt must produce platform-specific output files from a common agent manifest (`agent.yaml`). Different platforms have different file formats and locations:

- **Claude Code**: frontmatter Markdown at `.claude/agents/<name>.md`
- **AgentSkills.io**: frontmatter Markdown at `.agents/skills/<name>/SKILL.md`
- **Codex** (planned): TOML at `.codex/agents/<name>.toml` with managed-region injection in `.codex/config.toml`
- **Cursor**, **Copilot**, etc. (future)

A design decision is required for how the compiler knows about platforms and how new platforms are added.

## Decision

Use a registry-based adapter pattern. Each adapter is a module that:

1. Declares a `platform` string identifier (e.g., `"claude"`, `"agentskills"`)
2. Implements a `serialize(agent: AgentRecord, config: AgentQuiltConfig): AdapterOutput[]` function
3. Self-registers via `registerAdapter(adapter)` on import

The registry (`adapters/index.ts`) maintains the global adapter map. `compileAgentDefinitionsTarget` looks up adapters by platform name and calls `serialize`.

```typescript
interface PlatformAdapter {
  platform: string;
  serialize(agent: AgentRecord, config: AgentQuiltConfig): AdapterOutput[];
}
```

### Implemented adapters

- `adapters/claude.ts` — Claude Code (`claude`)
- `adapters/agentskills.ts` — AgentSkills.io (`agentskills`)

### Planned adapters

- `adapters/codex.ts` — Codex [DEFERRED] (v1.1 §6.2–6.3)

## Rationale

**Self-registration via import** means adapters are added to the registry simply by importing them. The index file controls which adapters are available. This avoids a separate registration config.

**Separation from core compiler** ensures that adding a new platform adapter requires no changes to the compiler or lock writer — only a new file in `adapters/` and an import in `adapters/index.ts`.

**Explicit platform list in config** (`platforms: ["claude", "agentskills"]`) means the config is the source of truth for what gets generated. Unknown platforms throw a config validation error rather than silently producing no output.

## Consequences

Positive:

- Adding a new platform requires only one new file
- Config validation catches unknown platform names at load time
- Core compiler is decoupled from any specific output format
- Community adapters can eventually follow the same interface

Negative:

- Adapters self-register as a side effect of import — this is an implicit dependency
- The adapter interface is not yet published or versioned; breaking changes require updating all adapters
- No lazy loading — all adapters are imported eagerly even if not used in the current config
