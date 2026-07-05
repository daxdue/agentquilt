# AgentQuilt

AgentQuilt is a Git-native framework for maintaining AI agent instructions as structured, composable, validated source files instead of manually edited Markdown prompts.

## Problem

Large agent Markdown files are hard to maintain in distributed teams. Multiple developers editing the same `.md` file often create merge conflicts, and those conflicts are difficult to resolve because agent instructions are semantic, not purely syntactic.

## Solution

AgentQuilt introduces a structured source model:

```
Agent = Manifest + Instruction Blocks + Generated Prompt
```

Developers edit small, ordered instruction blocks (fragments). AgentQuilt validates them and compiles them deterministically into platform-specific artifacts — the same sources can produce Claude Code agents, AgentSkills skills, Cursor rules, Copilot instructions, and more. Generated files are never hand-edited; a lock file records every fragment hash so CI can detect drift.

## Supported Platforms

| Platform | Type | Output |
|---|---|---|
| `claude` | adapter | `.claude/agents/<name>.md` (one file per agent) |
| `agentskills` | adapter | `.agents/skills/<name>/SKILL.md` (one skill per agent) |
| `cursor` | preset | `.cursor/rules/<agent>.mdc` (combined) |
| `copilot` | preset | `.github/copilot-instructions.md` (combined) |
| `gemini` | preset | `GEMINI.md` (combined) |

Plain Markdown document targets (e.g. a repo-level `AGENTS.md`) are also supported.

## Requirements

- Node.js >= 18

## Installation

```bash
npm install -g agentquilt
```

Or from source:

```bash
git clone https://github.com/daxdue/agentquilt.git
cd agentquilt
npm install
npm run build
```

## Get Started

```bash
# 1. Scaffold a project (in your repo root)
agentquilt init --platform claude
```

This creates `.agentquilt/config.yaml`, the `.agentquilt/agents/` source tree, and a `.gitattributes`. If you already have agents in `.claude/agents/` or `.agents/skills/`, `init` adopts them as source agents automatically. It refuses to overwrite an existing config unless you pass `--force`, and never overwrites an existing `.gitattributes`.

```bash
# 2. Add an agent
agentquilt agents add reviewer
```

This scaffolds `.agentquilt/agents/reviewer/` with a manifest and a first instruction block:

```
.agentquilt/agents/reviewer/
├── agent.yaml       # description, model tier, permissions
└── 010-role.md      # first instruction block
```

Edit `010-role.md`, and add more blocks as separate files — `020-style.md`, `030-testing.md`, … Blocks compile in filename order; use gaps of 10 so you can insert later without renumbering. Fragments in `.agentquilt/agents/_shared/` can be included across agents.

```bash
# 3. Compile
agentquilt build
```

This writes the platform outputs (e.g. `.claude/agents/reviewer.md`) and `agentquilt.lock`. Commit sources and generated outputs together.

```bash
# 4. Guard it in CI
agentquilt check
```

`check` exits non-zero if any generated output or the lock is stale relative to the sources — so a PR that edits a generated file by hand, or edits sources without rebuilding, fails the gate.

**Exit codes:** `0` success · `1` drift detected (`check`) · `2` config or validation error · `3` I/O error.

## Commands

```bash
agentquilt init [--platform <p>...] [--force]   # Scaffold project; adopt existing agents
agentquilt build                                # Compile all targets, write outputs and lock
agentquilt check                                # CI gate: detect drift between source and outputs
agentquilt agents add <name>                    # Scaffold a new agent directory
agentquilt agents list                          # List agents and resolved models per platform
```

## Repository Structure

```
repo/
├── .agentquilt/               # All AgentQuilt sources live here
│   ├── config.yaml            # Project config (targets, model tiers, sourceDir)
│   ├── agents/                # Source agent definitions
│   │   ├── _shared/           # Shared fragments (included across agents)
│   │   └── <agent-id>/
│   │       ├── agent.yaml     # Agent manifest
│   │       └── NNN-block.md   # Instruction blocks (ordered by prefix)
│   └── meta-agents/           # AgentQuilt's own meta-agents (framework development)
├── .claude/agents/            # Compiled Claude Code agent outputs (generated)
├── AGENTS.md                  # Compiled document target (generated)
├── agentquilt.lock            # Fragment hashes and target versions (generated)
├── packages/
│   ├── agentquilt-cli/        # CLI source (TypeScript, Commander, Zod)
│   └── website/               # agentquilt.dev landing page (Astro)
├── schemas/                   # JSON Schema definitions (language-neutral)
├── policies/                  # SDLC gate policies and risk register
├── scripts/                   # Utility scripts and spike tests
└── .docs/                     # Architecture specs, ADRs, SDLC/STLC docs
```

The config is discovered at `.agentquilt/config.yaml` (or `.agentquilt/config.json`);
the legacy root locations `agentquilt.config.yaml` / `agentquilt.config.json` are
still honored as a fallback.

## Project Status

**v0.1.0** — the core author → build → check workflow: deterministic compiler, Zod-validated schemas, Claude and AgentSkills adapters, platform presets, lock file, and drift checking.

Planned next (see [Roadmap](.docs/roadmap.md)): eval-based regression testing, lint rules and semantic diff, `build --watch`, additional platform adapters.

## Goals

- Reduce merge conflicts in agent files
- Make agent changes reviewable
- Validate agent definitions before compilation
- Generate deterministic Markdown prompts
- Support CI gates
- Support eval-based regression testing (planned)
- Provide traceability for agent behavior changes

## Non-Goals

- Replacing human review
- Fully automatic semantic conflict resolution
- Building a web platform in the MVP
- Requiring live LLM calls for core compilation

## Documentation

- [Architecture Overview](.docs/architecture/overview.md)
- [v1 Specification](.docs/agentquilt-v1-spec.md)
- [v1.1 Addendum](.docs/agentquilt-v1.1-addendum.md)
- [Glossary](.docs/glossary.md)
- [Roadmap](.docs/roadmap.md)
- [Contributing](CONTRIBUTING.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit format, PR expectations, and ADR policy.

## License

MIT
