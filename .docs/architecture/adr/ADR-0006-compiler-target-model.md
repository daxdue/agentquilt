# ADR-0006: Target as the Central Compiler Abstraction

## Status

Accepted

## Context

AgentQuilt needs to support multiple output formats from a single set of source fragments: `AGENTS.md` for Codex, `CLAUDE.md` for Claude Code, Cursor rules, Copilot instructions, and per-agent definitions. A design decision is required about what abstraction drives compilation and what the data flow looks like.

Options considered:

- **Agent-centric**: the compiler iterates agents and produces all their outputs in one pass
- **Target-centric**: the compiler iterates targets; each target declares what fragments to include and what file to write
- **Hybrid**: agent-centric for `agent-definitions` targets, target-centric for document targets

## Decision

Use a target-centric model for document compilation, with a separate agent-definitions target type for per-agent outputs.

The data flow is:

```
agentquilt.config.yaml
  └─ targets[]
       ├─ document targets  →  compile()  →  CompiledTarget[]
       │                                       ↓
       │                          fragmentMap, content, version
       │
       └─ agent-definitions  →  compileAgentDefinitionsTarget()
             targets               ↓
                           AgentLockRecord[] + adapter outputs

All targets → createLock() → agentquilt.lock
```

The lock file (§6 of the v1 spec) binds fragments, targets, and agents into a Merkle-style version matrix. `agentquilt check` recompiles in memory and diffs against the on-disk lock to detect drift.

## Rationale

**Target-centric is declarative:** Contributors add a target to say "I want this output." The compiler figures out which fragments to include. This keeps the config readable and the compilation deterministic.

**Separation of concerns:** Document targets and agent-definition targets have different output shapes. Separating them into distinct types (`kind: "document"` vs. `kind: "agent-definitions"`) avoids a single over-loaded abstraction.

**Lock file as the integrity contract:** Binding all outputs to a single lock makes CI validation simple: one `agentquilt check` command verifies the entire workspace.

## Consequences

Positive:

- Config is declarative and readable
- Deterministic compilation from config → lock → output
- Single lock covers all output types
- `check` command is a one-shot CI gate

Negative:

- Two compilation paths (`compile` and `compileAgentDefinitionsTarget`) must be kept in sync
- Lock schema must evolve if new target kinds are added
