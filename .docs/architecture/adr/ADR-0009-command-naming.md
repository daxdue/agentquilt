# ADR-0009: CLI Command Naming

## Status

Accepted

## Context

Early planning documents described a command set modeled after build tools: `agentctl compile`, `agentctl compile --check`, `agentctl lint`, `agentctl verify`, `agentctl diff`, `agentctl test`. During Week 1 implementation, the command set was restructured to improve ergonomics and clarity.

## Decision

The implemented command set is:

| Command | Purpose |
|---|---|
| `agentquilt build` | Compile all targets, write outputs and lock |
| `agentquilt check` | CI gate: detect drift between source and disk |
| `agentquilt init` | Scaffold a new project |
| `agentquilt agents add <name>` | Scaffold a new agent directory |
| `agentquilt agents list` | List all agents and resolved models |

Commands not yet implemented (Week 2+):

| Command | Purpose |
|---|---|
| `agentquilt lint` | Validate fragment semantics (Week 2) |
| `agentquilt diff` | Show semantic diff between versions (Week 3) |
| `agentquilt eval` | Run eval test suite (Week 3) |

Commands deferred indefinitely:

| Command | Notes |
|---|---|
| `agentquilt build --watch` | Requires chokidar; not yet implemented |

## Rationale

**`build` instead of `compile`**: `build` is a universally understood term for "produce outputs from source." `compile` implies a language-specific transformation. Most developers reach for `npm run build` first.

**`check` as a separate command instead of `compile --check`**: Separating check from build reflects their different roles. `build` is for developers; `check` is for CI. A standalone `check` command is easier to invoke in CI pipelines (`npx agentquilt check`) and easier to explain ("run this in CI").

**`agents` subcommand namespace**: Agent-management operations (`add`, `list`) are grouped under `agents` to avoid polluting the top-level command namespace as more subcommands are added.

## Consequences

Positive:

- `build` and `check` are distinct tools with distinct audiences
- Command names align with common conventions (`build`, `init`, `check`)
- `agents` namespace is extensible for future agent management commands

Negative:

- `PROJECT_PLAN.md`, `WORK_BREAKDOWN.md`, and `test-strategy.md` use the old command names and are now inaccurate
- Any user documentation or scripts written against `agentctl compile` will need updating
