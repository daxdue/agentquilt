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
