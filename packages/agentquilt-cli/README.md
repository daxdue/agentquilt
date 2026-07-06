# agentquilt

CLI for [AgentQuilt](https://agentquilt.dev) — a Git-native framework for maintaining AI agent instructions as structured, composable, validated source files that compile deterministically into platform-specific outputs (`AGENTS.md`, `.claude/agents/*.md`, and more).

## Install

```bash
npm install -g agentquilt
# or per project
npm install --save-dev agentquilt
```

Requires Node >= 18.

## Commands

```bash
agentquilt init                  # Scaffold a new project; adopts existing .claude/agents/ and
                                 # .agents/skills/ files as sources (--force to re-init)
agentquilt build                 # Compile all targets, write outputs and lock file
agentquilt build --watch         # Rebuild automatically when fragments or config change
agentquilt check                 # CI gate: detect drift between source and committed outputs
agentquilt agents add <name>     # Scaffold a new agent directory with agent.yaml
agentquilt agents list           # List all agents and resolved models per platform
agentquilt skills add <name>     # Scaffold a new skill directory under .agentquilt/skills/
agentquilt skills list           # List all skills and their descriptions
```

Exit codes: `0` success · `1` drift detected (`check`) · `2` config or validation error · `3` I/O error.

## Documentation

Full documentation, specification, and examples: https://github.com/daxdue/agentquilt

## License

MIT
