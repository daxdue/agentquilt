# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AgentQuilt** is a Git-native framework for maintaining AI agent instruction files as structured, composable, validated source files instead of manually edited Markdown files.

**Current Status**: v0.1.0 (Week 1 complete). Core compiler, Zod schemas, and adapters implemented. CLI binary is `agentquilt`. See the [agentquilt-v1-spec.md](.docs/agentquilt-v1-spec.md) and [v1.1-addendum.md](.docs/agentquilt-v1.1-addendum.md) for the authoritative reference.

**Problem**: Large agent Markdown files are hard to maintain in distributed teams. Multiple developers editing the same `.md` file create merge conflicts that are difficult to resolve because agent instructions are semantic, not syntactic.

**Solution**: Agent instructions are represented as small, ordered structured source files (fragments) that compile deterministically into a single Markdown artifact. This enables reviewable changes, validation before compilation, and conflict-free parallel editing.

## Core Architecture

AgentQuilt operates on this model:

```
Agent = Manifest + Instruction Blocks + Evals + Generated Prompt
```

### Key Concepts

- **Fragment**: A small Markdown file representing one concern (role, build commands, testing rules, etc.). Fragments are the unit of authoring and versioning.
- **Agent**: A directory under `.agentquilt/agents/` containing a manifest and instruction blocks.
- **Manifest**: `agent.yaml` file with minimal metadata (`description`, `name`, `model`, `permissions`, `x-<platform>` extensions) for agent-definition targets.
- **Instruction Block**: An optional numbered fragment (`.md` file) with optional YAML front-matter (`tags`, etc.). Multiple blocks compose a body via deterministic order.
- **Target**: The central abstraction—an output path + ordered list of includes. Enables multi-agent support and platform-agnostic output (same fragments → `AGENTS.md` + `CLAUDE.md` + Cursor rules + Copilot instructions).
- **Compiler**: Reads manifests and blocks, validates them, generates deterministic Markdown output with hash verification.
- **Evals**: Behavior validation tests (prompt presence evals, live LLM evals).

### Directory Layout

```
repo/
├── .agentquilt/                     # All AgentQuilt sources (config + fragments)
│   ├── config.yaml                  # Global config (targets, model tiers, sourceDir)
│   ├── agents/                      # Source directory for user agents
│   │   ├── _shared/                 # Fragments shared across agents
│   │   │   ├── 010-tone.md
│   │   │   └── 020-safety.md
│   │   └── <agent-id>/
│   │       ├── agent.yaml           # Manifest
│   │       ├── 010-role.md          # Instruction blocks (ordered by NNN prefix)
│   │       └── 020-criteria.md
│   └── meta-agents/                 # Meta-agents: AgentQuilt's own internal agents
│       ├── governance/              # Policy compliance, gate policy, risk review
│       ├── sdlc/                    # Requirements, architecture, code review, planning
│       ├── stlc/                    # Testing, evals, regression, security testing
│       ├── release/                 # Release coordination, migration, documentation
│       └── internal/                # Agent registry, conflict detection, refactoring
├── agentquilt.lock                  # Generated—do not hand-edit (version matrix)
├── AGENTS.md                        # Generated target—do not hand-edit
├── .docs/                           # Architecture specs, ADRs, SDLC, STLC docs
├── .github/                         # GitHub workflows, PR/issue templates
├── .planning/                       # Planning docs (not committed to releases)
├── policies/                        # SDLC gates, risk register
├── schemas/                         # JSON Schema definitions (language-neutral reference)
├── scripts/                         # Utility scripts and spike tests
├── packages/
│   └── agentquilt-cli/              # CLI implementation (TypeScript, Zod, Commander)
└── .gitignore, LICENSE, README.md
```

Config discovery order: `.agentquilt/config.yaml`, `.agentquilt/config.json`, then the legacy root `agentquilt.config.yaml` / `agentquilt.config.json` (see ADR-0010).

**`.agentquilt/meta-agents/` directory** contains the framework's own internal agent definitions (meta-agents). These are structured the same way as user agents but are intended to support the framework's own workflows (policy review, code review, release coordination, etc.). They are stub implementations to be populated as the project matures and is self-hosted.

## Key Documentation

Start here for understanding:
- **[agentquilt-v1-spec.md](.docs/agentquilt-v1-spec.md)** — Authoritative reference for v1 implementation. Sections are marked [LOCKED] (settled), [v1 CHOICE] (decided here), or [DEFERRED] (out of scope).
- **[Architecture Overview](.docs/architecture/overview.md)** — High-level design and component diagram.
- **[ADRs](.docs/architecture/adr/)** — Architecture Decision Records (project structure, YAML format, generated file policy, AI assistance model).

Implementation details:
- **[PROJECT_PLAN.md](.planning/PROJECT_PLAN.md)** — 4-week rollout with tasks and dependencies.
- **[WORK_BREAKDOWN.md](.planning/WORK_BREAKDOWN.md)** — Quick reference for GitHub issues.
- **[Glossary](.docs/glossary.md)** — Terminology and definitions.

Lifecycle and governance:
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Branch naming, commit message format, PR expectations, ADR policy.
- **[SDLC Lifecycle](.docs/sdlc/lifecycle.md)** — Pre-release phase constraints.
- **[Branching Strategy](.docs/sdlc/branching-strategy.md)** — Release branch strategy.

Testing and validation:
- **[Test Strategy](.docs/stlc/test-strategy.md)** — Unit, integration, and golden-file testing approach.
- **[Eval Strategy](.docs/stlc/eval-strategy.md)** — How evals validate agent behavior.
- **[CI Gates](.docs/sdlc/gates.md)** — Quality gates enforced in CI.

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

Generated files (`agentquilt.lock`, `AGENTS.md`, `CLAUDE.md`, etc.) must **never** be manually edited. If generated output changes, regenerate using the appropriate command once the CLI exists. Changes to generated files should only come from manifest or block changes.

**Strict Rule for AGENTS.md and CLAUDE.md:**
- NO emojis (e.g., ✅, ✘, 🚀, 📋, etc.)
- NO smileys or emoticons (e.g., :), :( , :-), etc.)
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

## Development Commands

From root (using npm workspaces) or `packages/agentquilt-cli/`:

```bash
# Install dependencies
npm install

# Build the CLI
npm run build

# Run tests
npm test

# CLI commands (available after npm run build or npm install -g):
agentquilt init                          # Scaffold a new project with config and shared fragments
agentquilt build                         # Compile all targets, write outputs and lock file
agentquilt check                         # CI gate: detect drift between source and disk
agentquilt agents add <name>             # Scaffold a new agent directory with agent.yaml
agentquilt agents list                   # List all agents and resolved models per platform
```

**Exit codes:**
- 0: success
- 1: drift detected (check failed)
- 2: config or validation error
- 3: I/O error

## Key Design Principles & Locked Decisions

From the v1 spec ([agentquilt-v1-spec.md](.docs/agentquilt-v1-spec.md)):

1. **Deterministic output**: The same manifest + blocks always produce identical Markdown, enabling reproducible builds.
2. **Git-native workflow**: All source is versionable; generated files are never hand-edited.
3. **Fragment ordering**: Use gaps of 10 in numbering (`010`, `020`, `030`) to allow insertion without renumbering.
4. **Normalization**: Fragments are normalized (trailing newlines, line endings) before hashing so hash always matches output.
5. **Fragment hash excluded from metadata**: Editing tags or front-matter doesn't bump target versions.
6. **Shared fragments**: `_shared/` fragments can be included in multiple agents.
7. **Target versioning**: Merkle-style root over ordered fragments + format version—binds content, order, and format identity.
8. **No manual conflict resolution**: Conflicts become code review problems, not merge resolution.

## Schemas & Validation

JSON schemas for validation:
- **[agent-manifest.schema.json](schemas/agent-manifest.schema.json)** — Manifest structure validation.
- **[instruction-block.schema.json](schemas/instruction-block.schema.json)** — Block metadata and structure.
- **[eval-case.schema.json](schemas/eval-case.schema.json)** — Eval test definitions.
- **[gate-policy.schema.json](schemas/gate-policy.schema.json)** — CI gate policy definitions.

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

## Important Notes for Implementation

- **TypeScript + Zod**: Schema validation will use TypeScript and Zod (see [PROJECT_PLAN.md](.planning/PROJECT_PLAN.md) 1.1).
- **No locale-aware sorting**: Fragment ordering uses Unicode code points only; never use `localeCompare()`.
- **Cross-platform hashing**: Line endings normalized to LF before hashing (SHA-256).
- **Linked fragments**: Blocks can reference other blocks via `conflicts_with`, `supersedes`, `applies_when` metadata.
- **Risk metadata**: Defaults to "medium"; explicitly set for high-risk or sensitive instructions.
- **Status filtering**: Deprecated blocks never compiled; draft blocks always excluded (an `--include-draft` flag is planned but not yet implemented).

## Package Details

- **npm package**: `agentquilt-cli` (https://github.com/daxdue/agentquilt)
- **Node requirement**: >= 18
- **CLI entry point**: `packages/agentquilt-cli/dist/index.js` (compiled from TypeScript)
- **Built with**: TypeScript, Commander.js, Zod, YAML parser
- **License**: MIT

## Links

- **Public website**: https://agentquilt.dev
- **GitHub**: https://github.com/daxdue/agentquilt
- **Issues**: https://github.com/daxdue/agentquilt/issues
