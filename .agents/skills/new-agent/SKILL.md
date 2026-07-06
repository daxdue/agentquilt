---
name: new-agent
description: Create a new AgentQuilt agent or skill from a plain-language
  description. Scaffolds the source directory, writes the manifest and
  instruction fragments, registers the target in config.yaml, and compiles it.
  Use when the user asks to create, add, or init a new agent or skill in a
  repository that uses AgentQuilt.
---

# Create a new AgentQuilt agent or skill

You are helping the user author a new agent or skill in a repository managed by AgentQuilt. In AgentQuilt, neither is ever a single hand-written Markdown file: both are source directories containing a manifest (`agent.yaml`) plus ordered instruction fragments, compiled into platform outputs by `agentquilt build`. Agents live under the configured sourceDir (default `.agentquilt/agents/`) and compile to platform agent definitions such as `.claude/agents/<name>.md`; skills live under the sibling `.agentquilt/skills/` directory and compile to the vendor-neutral Agent Skills format at `.agents/skills/<name>/SKILL.md`. Your job is to turn the user's intent into good sources, not to write output files directly.

Never create or edit generated outputs by hand (`AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`, `.agents/skills/*/SKILL.md`, `agentquilt.lock`). All changes go through the sources and the build.

## Workflow

Follow these steps in order.

1. **Clarify intent.** From the user's request (ask only if genuinely unclear), establish:
   - Whether this is an agent (a delegated persona with its own model and permissions, e.g. a Claude Code subagent) or a skill (an on-demand workflow the host agent loads and follows).
   - What it does and, just as important, when it should be used.
   - For agents: how much access it needs (`read-only` for review/analysis, `workspace` for editing files, `full`) and whether it needs a specific model tier (`frontier`, `balanced`, `fast`) or should inherit the platform default.

2. **Scaffold the sources.** Pick a kebab-case name and run one of:

   ```bash
   npx agentquilt agents add <name>   # agent under .agentquilt/agents/<name>/
   npx agentquilt skills add <name>   # skill under .agentquilt/skills/<name>/
   ```

   Both create an `agent.yaml` manifest plus a placeholder first fragment (`010-role.md` for agents, `010-instructions.md` for skills).

3. **Write the manifest** (`agent.yaml`):
   - `description` is the delegation trigger: the host tool decides from it when to hand tasks to this agent or load this skill. Write it in third person and state both capability and trigger ("...identifies bugs and performance issues. Use when reviewing pull requests.").
   - For agents, set `permissions` explicitly; omit `model` to use the config default tier, or set a tier.
   - For skills, keep `model: inherit` — skills carry no model of their own.

4. **Write the instruction fragments.** Replace the placeholder fragment and add more as needed. See the authoring guidelines below.

5. **Register the target.** Add it to the matching `agent-definitions` target in `.agentquilt/config.yaml` (an existing block, or a new one). Agents compile from the global sourceDir; skills targets add `sourceDir: skills`:

   ```yaml
   - kind: agent-definitions
     agents: [<name>]         # or "*" to include every directory
     platforms: [claude]      # emits .claude/agents/<name>.md

   - kind: agent-definitions
     sourceDir: skills        # resolved against the parent of sourceDir
     agents: [<name>]
     platforms: [agentskills] # emits .agents/skills/<name>/SKILL.md
   ```

   Note: a model tier only resolves for platforms mapped under `modelTiers` in config. If the target platform has no mapping (common for `agentskills`), use `model: inherit` in the manifest.

6. **Build and verify.**

   ```bash
   npx agentquilt build
   npx agentquilt check
   ```

   Confirm the compiled output exists and reads well end to end, then show the user the generated file and a summary of the sources you created. Commit sources, generated outputs, and `agentquilt.lock` together.

## Authoring guidelines for fragments

- One concern per fragment: role, review criteria, output format, safety rules each get their own file. Fragments are the unit of review and versioning; small fragments mean conflict-free parallel edits.
- Number with gaps of 10 (`010`, `020`, `030`) so fragments can be inserted later without renumbering. Fragments compile in numeric order.
- Address the agent directly in imperative voice ("You are...", "Always...", "Never..."). The compiled body is the agent's system prompt.
- The first fragment (`010-role.md`) states who the agent is and its goal. Later fragments add criteria, constraints, and output expectations.
- Reuse `_shared/` fragments for rules that apply across agents (tone, safety) instead of duplicating text.
- Fragment bodies are emitted verbatim: whatever you write is exactly what the agent receives. Do not rely on the compiler to clean anything up.
- Respect the host repository's authoring policies. In the AgentQuilt repository itself, fragments must be plain text with no emojis or pictographic symbols (see `.docs/EMOJI_POLICY.md`); use markers like `[OK]` and `WARNING` instead.
