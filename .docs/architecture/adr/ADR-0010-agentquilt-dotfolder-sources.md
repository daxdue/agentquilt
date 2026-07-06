# ADR-0010: AgentQuilt Sources Live Under .agentquilt/

## Status

Accepted

## Context

Through v0.1.0 development, AgentQuilt sources were spread across the repository
root: `agents/` (user agents), `.agents/` (meta-agents), and
`agentquilt.config.yaml`. Consuming repositories therefore acquired multiple
AgentQuilt-owned top-level entries, and the `agents/` name collided conceptually
with generated per-platform agent outputs (`.claude/agents/`) and with the
AgentSkills output convention (`.agents/skills/`).

For the first release the product is scoped to the core workflow — author
fragments, `agentquilt build`, `agentquilt check` — so the source layout is the
main surface a consuming repository sees. It should be a single, clearly-owned
location, and it must remain platform agnostic: the layout carries no
provider-specific structure; platform differences live entirely in targets
(presets and adapters).

## Decision

All AgentQuilt sources live under a single `.agentquilt/` dotfolder:

```
.agentquilt/
├── config.yaml         # project config (was agentquilt.config.yaml)
└── agents/             # fragment sources (was agents/), default sourceDir
    ├── _shared/
    └── <agent-id>/
        ├── agent.yaml
        └── NNN-block.md
```

- **Config discovery order**: `.agentquilt/config.yaml`, `.agentquilt/config.json`,
  then the legacy root `agentquilt.config.yaml`, `agentquilt.config.json`.
  The legacy locations remain supported as a fallback so existing projects keep
  working without migration.
- **Default `sourceDir`** becomes `.agentquilt/agents` (still overridable).
- **Per-target `sourceDir` overrides** resolve against the parent of the global
  sourceDir — i.e. against `.agentquilt/` under the default layout. Sibling
  source trees such as this repository's meta-agents are expressed as
  `sourceDir: meta-agents` → `.agentquilt/meta-agents/`.
- **Generated outputs are unaffected.** Targets still write to the paths the
  platforms read (`AGENTS.md`, `.claude/agents/<name>.md`,
  `.agents/skills/<name>/SKILL.md`, …), and `agentquilt.lock` stays at the repo
  root next to the outputs it verifies.
- **`agentquilt init`** scaffolds the dotfolder layout; **`agentquilt agents add`**
  resolves the configured sourceDir instead of assuming `agents/`.
- The generated-file header names the configured source directory
  (`source: .agentquilt/agents/`) instead of a hardcoded `agents/`.

This repository migrated accordingly: `agents/` → `.agentquilt/agents/`,
`.agents/` → `.agentquilt/meta-agents/`, `agentquilt.config.yaml` →
`.agentquilt/config.yaml`.

## Rationale

- **One owned location**: everything a team edits for AgentQuilt sits in one
  dotfolder, mirroring established tool conventions (`.github/`, `.cursor/`,
  `.claude/`). Repo roots stay clean; ownership in code review is obvious.
- **No name collisions**: `agents/` no longer competes with platform output
  directories or project domain folders.
- **Room to grow**: future source kinds (`evals/`, `policies/`) become
  `.agentquilt/` siblings of `agents/` without new top-level entries.
- **Platform agnostic**: the layout encodes nothing provider-specific; adding a
  platform means adding a target, never restructuring sources.

## Consequences

- Fragment ids are sourceDir-relative and therefore unchanged by the move; the
  document target version is stable. Lock entries that record repo-relative
  agent paths (agent `dir`, `bodyFragments`, agent `version`) change once at
  migration.
- Documentation and examples reference `.agentquilt/agents/`; the v1 spec's
  `agents/` layout is superseded on this point by this ADR.
- Supersedes the corresponding directory-structure points of ADR-0001
  (`agents/` and `.agents/` top-level entries).
