# AgentQuilt

AgentQuilt is a Git-native framework for maintaining AI agent instructions as structured, composable, validated source files instead of manually edited Markdown prompts.

## Problem

Large agent Markdown files are hard to maintain in distributed teams. Multiple developers editing the same `.md` file often create merge conflicts, and those conflicts are difficult to resolve because agent instructions are semantic, not purely syntactic.

## Solution

AgentQuilt introduces a structured source model:

```
Agent = Manifest + Instruction Blocks + Evals + Generated Prompt
```

Developers edit small structured instruction blocks. AgentQuilt validates and compiles them into deterministic Markdown artifacts per platform (Claude Code, AgentSkills, etc.).

## Goals

- Reduce merge conflicts in agent files
- Make agent changes reviewable
- Validate agent definitions before compilation
- Generate deterministic Markdown prompts
- Support CI gates
- Support eval-based regression testing
- Provide traceability for agent behavior changes

## Non-Goals

- Replacing human review
- Fully automatic semantic conflict resolution
- Building a web platform in the MVP
- Requiring live LLM calls for core compilation

## Project Status

v0.1.0 — Core compiler, CLI, schemas, and platform adapters implemented.

## Requirements

- Node.js >= 18

## Installation

```bash
npm install -g agentquilt-cli
```

Or from source:

```bash
git clone https://github.com/daxdue/agentquilt.git
cd agentquilt
npm install
npm run build
```

## Usage

```bash
# Scaffold a new project
agentquilt init

# Compile all agents to platform-specific outputs
agentquilt build

# CI gate: detect drift between source and compiled output
agentquilt check

# Add a new agent scaffold
agentquilt agents add <name>

# List all agents and resolved models
agentquilt agents list
```

## Repository Structure

```
repo/
├── agents/                    # Source agent definitions
│   ├── _shared/               # Shared fragments (included across agents)
│   └── <agent-id>/
│       ├── agent.yaml         # Agent manifest
│       └── NNN-block.md       # Instruction blocks (ordered by prefix)
├── .agents/                   # AgentQuilt's own meta-agents (framework development)
├── .claude/agents/            # Compiled Claude Code agent outputs
├── agentquilt.config.yaml     # Project config (targets, model tiers, sourceDir)
├── agentquilt.lock            # Generated — do not edit
├── packages/
│   └── agentquilt-cli/        # CLI source (TypeScript, Commander, Zod)
├── schemas/                   # JSON Schema definitions (language-neutral)
├── policies/                  # Gate policies
└── .docs/                     # Architecture specs, ADRs, SDLC/STLC docs
```

## Documentation

- [Architecture Overview](.docs/architecture/overview.md)
- [v1 Specification](.docs/agentquilt-v1-spec.md)
- [v1.1 Addendum](.docs/agentquilt-v1.1-addendum.md)
- [Glossary](.docs/glossary.md)
- [Roadmap](.docs/roadmap.md)
- [Contributing](CONTRIBUTING.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit format, PR expectations, and ADR policy.

## Architecture

See [.docs/architecture/overview.md](.docs/architecture/overview.md).

## License

MIT
