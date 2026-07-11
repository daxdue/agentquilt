## Core Architecture

AgentQuilt operates on this model:

```
Agent = Manifest + Instruction Blocks + Evals + Generated Prompt
```

### Key Concepts

- **Fragment**: A small Markdown file representing one concern (role, build commands, testing rules, etc.). Fragments are the unit of authoring and versioning.
- **Agent**: A directory under `.agentquilt/agents/` containing a manifest and instruction blocks.
- **Skill**: A directory under `.agentquilt/skills/` using the same manifest + block format, compiled to the vendor-neutral Agent Skills format (`.agents/skills/<name>/SKILL.md`) via an `agentskills` target with `sourceDir: skills`.
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
│   └── agents/                      # Source directory for all agents (flat)
│       ├── project/                 # Fragments for this guide (AGENTS.md + CLAUDE.md); no agent.yaml
│       └── <agent-id>/              # One directory per agent, incl. the repo's own development agents
│           ├── agent.yaml           # Manifest
│           └── 010-role.md          # Instruction blocks (ordered by NNN prefix)
├── agentquilt.lock                  # Generated—do not hand-edit (version matrix)
├── AGENTS.md                        # Generated target—do not hand-edit
├── CLAUDE.md                        # Generated target—do not hand-edit (same fragments)
├── .claude/agents/                  # Generated agent definitions—do not hand-edit
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

**Development agents**: `.agentquilt/agents/` also contains the repository's own development agents (code review, testing, governance, release support, etc.), managed the same way as any other agent and compiled to `.claude/agents/*.md` by a single wildcard `agent-definitions` target. They are invoked manually through provider CLIs (Claude Code); no automation invokes them programmatically. Many are stubs pending rationalization.
