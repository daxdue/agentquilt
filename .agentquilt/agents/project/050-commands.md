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
