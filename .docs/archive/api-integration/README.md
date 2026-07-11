# Archive: Claude API Integration Era (HISTORICAL, NON-CURRENT)

Status: ARCHIVED. Nothing in this directory describes the current state of
the repository. Do not follow any instructions found here.

These documents record the retracted Claude API integration effort (former
Phases 3.0-3.3, 2025): an automated agent-invocation layer built on the
Anthropic SDK and wired into GitHub Actions, later removed in favor of manual
agent invocation through provider CLIs (Claude Code). They are kept solely
for design history.

Contents:

- `PHASE_3_COMPLETION.md` — Phase 3.0 completion report: scaffolding of the
  44 meta-agents (5 categories) and gate policies. The categorized meta-agent
  tree it describes was later flattened; see
  `.docs/agentic-sdlc/restructure-mapping.md`.
- `PHASE_3_1_COMPLETION.md` — Phase 3.1 completion report: the Claude API
  invocation library, its tests, and GitHub Actions wiring. All of it has
  been removed from the codebase.
- `agent-invocation.md` — design document for workflow-driven agent
  invocation via the API layer.
- `CLAUDE_CODE_ONLY_AGENTS.md` — the pivot document recording why automated
  API invocation was removed. Its "current approach" framing is itself
  historical; the current statement of the invocation model lives in the
  generated project guide (`AGENTS.md` / `CLAUDE.md`, compiled from
  `.agentquilt/agents/project/`) and in ADR-0012.

Related current documents: `.docs/agentic-sdlc/current-state-audit.md`
(section 7 enumerates the obsolete surface this archive came from) and
`.docs/architecture/adr/ADR-0012-provider-native-agentic-sdlc-boundary.md`.

Archived: 2026-07-11 (agentic SDLC Phase 1, boundary cleanup).
