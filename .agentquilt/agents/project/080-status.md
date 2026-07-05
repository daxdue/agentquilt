## Current Phase: Phase 3.3 Complete

[DONE] **Completed (Week 1 — Foundations)**
- Zod schema definitions for config, lock, and agent definitions
- Core compiler: fragment scanning, normalization, hashing, deterministic output
- Agent compiler: metadata hashing, adapter system, per-platform serialization
- Claude and AgentSkills adapters (v1.1 addendum)
- Lock writer and drift checker
- CLI: init, build, check, agents add, agents list

[DONE] **Completed (Phase 3.0 — Agent Scaffolding & Discovery)**
- 44 meta-agents scaffolded across 5 categories (governance, SDLC, STLC, release, internal)
- All agents compiled to Claude Code format (.claude/agents/*.md) — 45 managed outputs (44 meta-agents + 1 user agent `reviewer`; the `test-runner` agent in `.claude/agents/` is hand-authored and not managed by AgentQuilt)
- **Agent discovery working in Claude Code** — all agents now discoverable and usable
- Five gate policies defined with AI assistance blocks (intake, requirement, architecture, pr-quality, release)
- Risk register and SDLC/STLC strategies documented
- Authority model (ADR-0004) enforced in all agents
- GitHub Actions workflow templates (intake, pr-review, release) — ready for Phase 3.1 implementation

[DONE] **Completed (Phase 3.1 — Claude API Integration)**
- Core integration library: `packages/agentquilt-cli/src/integration/claude-agent.ts`
  - `invokeAgent(agentPath, gateName, taskInput)` — Main invocation function
  - `loadAgentDefinition()` — Parse compiled agents from .claude/agents/
  - `parseAgentResponse()` — Convert text to structured findings
  - `parseFinding()` — Parse individual finding lines
- Complete unit test suite: 37 tests, all passing
- GitHub Actions integration layer: `.github/actions/invoke-agent/` (removed in the later Claude Code-Only Simplification)
- Workflow integration complete:
  - `intake.yml` — Issues triage via product-discovery agent
  - `pr-review.yml` — PRs reviewed by code-review, eval-designer, security-review agents
  - `release.yml` — Release coordination via release-manager, changelog, versioning agents
- Full error handling and edge case coverage

[DONE] **Completed (Phase 3.2 — Workflow Wiring)**
- All three GitHub Actions workflows updated to use real agent invocation
- Workflows tested with mock responses (ready for live testing)
- Graceful error handling if API unavailable
- Conditional agent invocation (eval agent only if agents/ changed, security agent only for high-risk files)

[DONE] **Completed (Phase 3.3 — Environment Setup)**
- Rate limiting: Token bucket algorithm with 10 requests/minute (configurable)
- Structured JSON logging: Timestamp, agent, model, tokens, duration, status
- Exponential backoff retry logic (3 attempts for transient failures)
- Cost monitoring guide: $1-2/month estimated spend
- Spending limits: Documented setup in Anthropic console
- GitHub Actions secrets guide: Step-by-step ANTHROPIC_API_KEY setup
- Comprehensive troubleshooting guide with common issues and solutions
- Production-ready error handling and observability

[DONE] **Completed (Claude Code-Only Simplification)**
- Removed automatic agent invocation from CI/CD workflows
- Simplified to manual invocation via Claude Code
- Aligns with ADR-0004: humans make decisions
- Reduced complexity, eliminated API costs from CI/CD
- All 45 managed agents remain discoverable and usable

[DEFERRED] **Optional Future: Auto-Invocation (Phase 3.4-3.5)**
- Claude API integration layer created but not used in workflows
- Can be re-enabled if automated agent invocation desired
- See `.docs/PHASE_3_1_COMPLETION.md` for implementation details
- See `.docs/CLAUDE_CODE_ONLY_AGENTS.md` for current approach
- Week 2: Lint rules, semantic diff, additional enforcement
- Week 3: Eval runner, regression testing
- Week 4: Release packaging, migration tools
- [DEFERRED] `agentquilt build --watch` — file-watching mode (requires chokidar or equivalent)
- [DEFERRED] Codex adapter — `.codex/agents/<name>.toml` + managed-region injection in `.codex/config.toml` (v1.1 §6.2–6.3)

See [PROJECT_PLAN.md](.planning/PROJECT_PLAN.md) for historical context and full roadmap.
