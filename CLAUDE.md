# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AgentQuilt** is a Git-native framework for maintaining AI agent instruction files as structured, composable, validated source files instead of manually edited Markdown files.

**Current Status**: Pre-release, placeholder version (v0.0.1). Functional implementation is in active development following the [4-week rollout plan](.planning/PROJECT_PLAN.md). The CLI tool is `agentctl`.

**Problem**: Large agent Markdown files are hard to maintain in distributed teams. Multiple developers editing the same `.md` file create merge conflicts that are difficult to resolve because agent instructions are semantic, not syntactic.

**Solution**: Agent instructions are represented as small, ordered structured source files (fragments) that compile deterministically into a single Markdown artifact. This enables reviewable changes, validation before compilation, and conflict-free parallel editing.

## Core Architecture

AgentQuilt operates on this model:

```
Agent = Manifest + Instruction Blocks + Evals + Generated Prompt
```

### Key Concepts

- **Fragment**: A small Markdown file representing one concern (role, build commands, testing rules, etc.). Fragments are the unit of authoring and versioning.
- **Agent**: A directory under `agents/` containing a manifest and instruction blocks.
- **Manifest**: YAML file defining agent metadata, sections, owners, and compilation settings.
- **Instruction Block**: A fragment of agent instruction with metadata (type, owner, risk, status, applies_when, conflicts_with, etc.).
- **Target**: The central abstraction—an output path + ordered list of includes. Enables multi-agent support and platform-agnostic output (same fragments → `AGENTS.md` + `CLAUDE.md` + Cursor rules + Copilot instructions).
- **Compiler**: Reads manifests and blocks, validates them, generates deterministic Markdown output with hash verification.
- **Evals**: Behavior validation tests (prompt presence evals, live LLM evals).

### Directory Layout

```
repo/
├── agents/                          # Source directory for all agents
│   ├── _shared/                     # Fragments shared across agents
│   │   ├── 010-tone.md
│   │   └── 020-safety.md
│   ├── <agent-id>/
│   │   ├── agent.yaml               # Manifest
│   │   ├── 010-role.md              # Instruction blocks (ordered)
│   │   └── 020-testing.md
│   └── ...
├── agentquilt.config.yaml           # Global config
├── agentquilt.lock                  # Generated—do not hand-edit
├── AGENTS.md                        # Generated target
├── CLAUDE.md                        # Generated target
├── .docs/                           # Architecture, decision records, policies
├── .planning/                       # Work breakdown (not committed)
├── policies/                        # SDLC gates, risk register
├── schemas/                         # JSON schemas for validation
└── .gitignore
```

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

Currently, the project is a placeholder. When implementation begins:

```bash
# Install dependencies
npm install

# Run tests (currently a placeholder)
npm test

# When CLI is ready:
agentctl compile <agent-path>           # Generate Markdown from manifest + blocks
agentctl lint <agent-path>              # Validate schema and lint rules
agentctl verify <agent-path>            # Verify hash consistency
agentctl eval <agent-path> [test.yaml]  # Run eval tests
```

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

## Current Phase: Pre-Release (Week 0)

The codebase is at the pre-release placeholder stage. Implementation begins with:

1. **Week 1 (Foundations)**: Schema definitions, core compiler, sample agent migration.
2. **Week 2 (Enforcement)**: Lint rules, verify command, CI gates.
3. **Week 3 (Quality)**: Eval runner, regression testing, documentation.
4. **Week 4 (Release)**: Release artifact generation, final validation.

See [PROJECT_PLAN.md](.planning/PROJECT_PLAN.md) for detailed task breakdown and dependencies.

## Important Notes for Implementation

- **TypeScript + Zod**: Schema validation will use TypeScript and Zod (see [PROJECT_PLAN.md](.planning/PROJECT_PLAN.md) 1.1).
- **No locale-aware sorting**: Fragment ordering uses Unicode code points only; never use `localeCompare()`.
- **Cross-platform hashing**: Line endings normalized to LF before hashing (SHA-256).
- **Linked fragments**: Blocks can reference other blocks via `conflicts_with`, `supersedes`, `applies_when` metadata.
- **Risk metadata**: Defaults to "medium"; explicitly set for high-risk or sensitive instructions.
- **Status filtering**: Deprecated blocks never compiled; draft blocks excluded unless `--include-draft` flag.

## Package Details

- **npm package**: `agentquilt` (https://github.com/daxdue/agentquilt)
- **Node requirement**: >= 18
- **Entry point**: `index.js` (currently placeholder)
- **License**: MIT

## Links

- **Public website**: https://agentquilt.dev
- **GitHub**: https://github.com/daxdue/agentquilt
- **Issues**: https://github.com/daxdue/agentquilt/issues
