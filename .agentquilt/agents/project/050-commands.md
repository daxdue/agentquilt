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
agentquilt build --watch                 # Rebuild automatically when fragments or config change
agentquilt check                         # CI gate: detect drift between source and disk
agentquilt agents add <name>             # Scaffold a new agent directory with agent.yaml
agentquilt agents list                   # List all agents and resolved models per platform
agentquilt skills add <name>             # Scaffold a new skill directory under .agentquilt/skills/
agentquilt skills list                   # List all skills and their descriptions
```

### Creating a new agent or skill (assisted)

The repo-level skill `.agents/skills/new-agent/SKILL.md` (compiled from `.agentquilt/skills/new-agent/`) guides an AI coding agent through creating a new AgentQuilt agent or skill: scaffolding sources, writing the manifest and fragments, registering the target, and building. When asked to create or init a new agent or skill, follow that skill's workflow instead of writing output files by hand.

**Exit codes:**
- 0: success
- 1: drift detected (check failed)
- 2: config or validation error
- 3: I/O error
