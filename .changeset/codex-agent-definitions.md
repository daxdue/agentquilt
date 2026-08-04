---
"agentquilt": minor
---

Enable Codex output for all repository development agents. The
`agent-definitions` target's `platforms` list now includes `codex`
alongside `claude`, and `modelTiers` gains a `codex` mapping for the
`balanced`, `frontier`, and `fast` tiers (`gpt-5.6-terra`, `gpt-5.6-sol`,
`gpt-5.6-luna` respectively). All 14 agent definitions now compile to both
`.claude/agents/<name>.md` and `.codex/agents/<name>.toml`.

Also removes two stale, hand-written `.codex/agents/*.toml` files
(`repository-explorer.toml`, `test-reviewer.toml`) left over from before
the agent portfolio was rationalized to `repository-analyst` and
`test-engineer`; they had no matching source and were never part of a
build output.

Migration notes:

- Run `agentquilt build` once after upgrading to generate the new Codex
  outputs and refresh `agentquilt.lock`.
