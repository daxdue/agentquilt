# ADR-0012: Provider-Native Agentic SDLC Boundary

## Status

Proposed

## Context

AgentQuilt's own development is moving to an agentic SDLC: AI agents perform
investigation, planning, bounded implementation, and review of changes to this
repository, under human control. An earlier attempt (Phases 3.1-3.3, June 2026)
built a Claude API integration layer inside the product package
(`packages/agentquilt-cli/src/integration/claude-agent.ts`, an
`@anthropic-ai/sdk` dependency, and GitHub Actions that invoked agents
automatically). That approach was retracted (see
`.docs/CLAUDE_CODE_ONLY_AGENTS.md`): it coupled development tooling to the
product package, added API cost and secret-management surface to CI, and
conflicted with the authority model in ADR-0004 (humans decide; agents advise).
Dead code and stale documentation from that era remain in the tree (inventoried
in `.docs/agentic-sdlc/current-state-audit.md`).

A durable boundary is needed between:

1. **The AgentQuilt product** — the `agentquilt` CLI, compiler, schemas, and
   adapters that users install; and
2. **The development pipeline** — the agents, workflows, guardrails, and
   process documents used to develop AgentQuilt itself.

## Decision

The agentic SDLC for this repository is implemented exclusively through
**provider-native mechanisms**, with the following boundary rules:

1. **LLM execution happens only in provider CLIs** (Claude Code, Codex),
   started and supervised by a human. The repository contains no runtime, SDK
   integration, API-invocation layer, orchestration service, scheduler, or
   workflow engine that executes agents.
2. **The product gains no pipeline features.** No `agentquilt` command runs,
   scores, or coordinates development agents. The compiler and adapters are not
   extended for the pipeline's sake. Using existing product capabilities to
   manage agent sources (dogfooding `agentquilt build`/`check` on
   `.agentquilt/agents/` and `.claude/agents/`) is permitted: it exercises the
   product as any consuming repository would, adding no code.
3. **Pipeline assets live in provider-native and process locations**:
   `CLAUDE.md`/`AGENTS.md`, `.claude/` (agents, skills, settings, hooks),
   `.codex/` (config, agents), `.agents/skills/`, `.docs/agentic-sdlc/`
   (provider-neutral contracts), `.github/` (issue forms, PR template,
   deterministic workflows), and `policies/`. Provider-specific duplication is
   accepted and documented rather than abstracted behind a shared runtime.
4. **Default CI is deterministic and model-free.** No GitHub Actions workflow
   invokes Claude, Codex, or any model API as part of required checks.
   Evaluations of the pipeline (scenario runs) are started manually through
   provider CLIs and are never required CI gates.
5. **Humans retain the ADR-0004 authority model.** Agents never approve, merge,
   tag, publish, or override CI. Gate triggers (architecture changes, public
   interface changes, new dependencies, persisted-format changes,
   generated-output semantics changes, destructive operations, releases)
   require explicit human approval.
6. **Generated-file policy (ADR-0003) applies to the pipeline itself.**
   Pipeline agents edit canonical sources and rebuild; they never hand-edit
   `agentquilt.lock`, compiled instruction files, or managed `.claude/agents/`
   outputs.
7. **A tiny deterministic hook helper is the only permitted executable
   exception**, and only when a provider requires a command handler, no native
   rule or existing repository command suffices, it remains development-only,
   contains no model calls, and its necessity is documented.

The legacy API-integration surface (integration source, its tests, the SDK
dependency, and documentation presenting API-driven invocation as current) is
declared obsolete and will be removed or explicitly archived as historical
(Phase 1 of the agentic SDLC effort).

## Rationale

- Provider CLIs already supply the runtime, sandboxing, permissions, hooks, and
  delegation the pipeline needs; rebuilding any of it is undifferentiated,
  high-risk work and blurs the product boundary.
- Keeping CI model-free keeps builds reproducible, free, and secret-less, and
  keeps quality gates trustworthy.
- Dogfooding the compiler for agent definitions gives the product real-world
  exercise (drift checking of agent outputs already surfaced real issues) while
  adding zero pipeline code.
- Accepting per-provider duplication is cheaper and safer than a translation
  layer, which would itself be a runtime.

## Consequences

- Development-agent behavior changes are reviewed as ordinary PRs to canonical
  sources plus rebuilt outputs; no deployment or service management exists.
- The pipeline works identically for any contributor with a provider CLI; there
  is nothing to install beyond the repository and the provider.
- Two provider configurations must be maintained in parallel; divergence is
  documented per asset.
- If a future product feature legitimately needs model invocation, it is a
  separate product decision with its own ADR; this ADR does not authorize it,
  and the retracted Phase 3.x layer must not be resurrected as its starting
  point.
- Removal of the obsolete integration surface slightly reduces test count and
  the devDependency footprint of `packages/agentquilt-cli`; published package
  behavior is unchanged.
