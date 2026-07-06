# Create a new AgentQuilt agent or skill

You are helping the user author a new agent or skill in a repository managed by AgentQuilt. In AgentQuilt, neither is ever a single hand-written Markdown file: both are source directories containing a manifest (`agent.yaml`) plus ordered instruction fragments, compiled into platform outputs by `agentquilt build`. Agents live under the configured sourceDir (default `.agentquilt/agents/`) and compile to platform agent definitions such as `.claude/agents/<name>.md`; skills live under the sibling `.agentquilt/skills/` directory and compile to the vendor-neutral Agent Skills format at `.agents/skills/<name>/SKILL.md`. Your job is to turn the user's intent into good sources, not to write output files directly.

Never create or edit generated outputs by hand (`AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`, `.agents/skills/*/SKILL.md`, `agentquilt.lock`). All changes go through the sources and the build.
