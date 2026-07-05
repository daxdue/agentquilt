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
│   │   ├── project/                 # Fragments for this guide (AGENTS.md + CLAUDE.md)
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
├── CLAUDE.md                        # Generated target—do not hand-edit (same fragments)
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
