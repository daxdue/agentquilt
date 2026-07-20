## Current Status

[DONE] **Week 1 — Foundations**
- Zod schema definitions for config, lock, and agent definitions
- Core compiler: fragment scanning, normalization, hashing, deterministic output
- Agent compiler: metadata hashing, adapter system, per-platform serialization
- Claude and AgentSkills adapters (v1.1 addendum)
- Lock writer and drift checker
- CLI: init, build (with --watch), check, agents add, agents list

[DONE] **Agent scaffolding and adoption**
- 14 development-agent definitions under `.agentquilt/agents/<name>/` (flat layout), all compiler-managed and compiled to `.claude/agents/*.md`: 8 core lifecycle roles plus 6 conditional specialists, rationalized from an earlier 46 (see [agent-portfolio.md](.docs/agentic-sdlc/agent-portfolio.md))
- `agentquilt check` verifies agent-definition outputs byte-for-byte in addition to the lock file
- Five gate policies defined (intake, requirement, architecture, pr-quality, release)
- Risk register and SDLC/STLC strategies documented
- Authority model (ADR-0004): agents draft and recommend; humans approve, merge, and release

[RETRACTED] **Claude API integration (former Phases 3.1-3.3)**
- An automated agent-invocation layer (Claude API integration, GitHub Actions wiring, rate limiting, cost monitoring) was built and later retracted
- Agents are invoked manually through provider CLIs (Claude Code); no CI workflow calls a model API
- CI runs deterministic checks only: typecheck, tests, coverage, build, drift check

[DEFERRED]
- Lint rules, semantic diff, additional enforcement
- Eval runner, regression testing
- Release packaging, migration tools
- Codex adapter — `.codex/agents/<name>.toml` + managed-region injection in `.codex/config.toml` (v1.1 §6.2–6.3)

See [PROJECT_PLAN.md](.planning/PROJECT_PLAN.md) for historical context and full roadmap.
