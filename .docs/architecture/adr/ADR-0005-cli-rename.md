# ADR-0005: CLI Binary Name — `agentquilt` (not `agentctl`)

## Status

Accepted

## Context

Early planning documents (`PROJECT_PLAN.md`, `WORK_BREAKDOWN.md`) used `agentctl` as the CLI binary name, following the pattern of Kubernetes (`kubectl`) and similar control tools. During Week 1 implementation, the binary was shipped as `agentquilt` to match the npm package name and make the tool's identity clear at the call site.

The rename also affected command names: early docs described `agentctl compile`, `agentctl lint`, `agentctl verify`, `agentctl diff`, `agentctl test`. The implemented CLI uses `agentquilt build`, `agentquilt check`, `agentquilt init`, `agentquilt agents add`, `agentquilt agents list`.

## Decision

The CLI binary name is `agentquilt`. Planning documents that reference `agentctl` are outdated and should be treated as historical context only.

## Rationale

**Name alignment with package identity:** Publishing `agentquilt` on npm and having users invoke `agentctl` would create cognitive friction. The tool should be called by its product name.

**Disambiguation:** `agentctl` is a generic name that conflicts with other agent-control tools in the ecosystem. `agentquilt` is unique and searchable.

**No backwards-compatibility obligation:** The CLI was not yet published publicly at the point of rename. No users were broken.

## Consequences

Positive:

- Consistent identity across binary, npm package, and domain (agentquilt.dev)
- No namespace conflict with other tools

Negative:

- Planning documents (`PROJECT_PLAN.md`, `WORK_BREAKDOWN.md`, `test-strategy.md`) reference the old name and must be updated manually — they are historical context only, not executable specifications
