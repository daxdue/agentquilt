# ADR-0011: Skills Are a First-Class Source Root

## Status

Accepted

## Context

AgentQuilt v1 has a single authoring unit — the agent record (an `agent.yaml`
manifest plus ordered instruction blocks) — and treats "skill" purely as an
output format: the `agentskills` adapter serializes any agent record to
`.agents/skills/<name>/SKILL.md`. That left no conventional home for sources
that only ever compile to skills, and no CLI scaffolding for them: the initial
release must let users add and init both agents and skills.

Skills and agents differ in intent, not format. An agent is a delegated persona
with its own model and permissions; a skill is an on-demand workflow the host
agent loads and follows, with no model of its own. Placing skill-only sources
under `.agentquilt/agents/` suggests the wrong thing to a reader.

## Decision

Skills get their own conventional source root, sibling to agents, using the
identical record format:

```
.agentquilt/
├── agents/             # agent records, default sourceDir
└── skills/             # skill records — same manifest + block format
    └── <skill-id>/
        ├── agent.yaml          # description, model: inherit
        └── 010-instructions.md
```

- **No compiler changes.** Skills targets are ordinary `agent-definitions`
  targets with `sourceDir: skills` (resolved against the parent of the global
  sourceDir per ADR-0010) and `platforms: [agentskills]`.
- **Manifest filename stays `agent.yaml`** in both roots. The canonical record
  is the same; a `skill.yaml` alias can be added later without breaking
  anything.
- **`agentquilt skills add <name>`** scaffolds a skill record with
  `model: inherit` (skills carry no model; this also avoids requiring an
  `agentskills` entry under `modelTiers`) and no `permissions`.
- **`agentquilt skills list`** lists skill records with their descriptions.
- **`agentquilt init --platform agentskills`** creates `.agentquilt/skills/`,
  emits a dedicated skills target (separate from the agents target), and adopts
  existing `.agents/skills/*/SKILL.md` files into `.agentquilt/skills/`
  (previously they were adopted into `agents/`).
- **`agentquilt init` generated configs no longer emit `agentskills:
  placeholder` model-tier entries** — scaffolded skills inherit, so the
  placeholder mappings were noise.

## Rationale

- The distinction is conventional, not structural: the compiler treats both
  roots identically, preserving the v1 single-record model and determinism
  guarantees.
- A record that should ship as both a subagent and a skill can still do so —
  list it in two targets; the source root only encodes its primary identity.
- Scaffolding defaults encode the semantic difference (permissions and model
  tier for agents; `model: inherit` and no permissions for skills) instead of
  the schema encoding it, keeping the manifest format unchanged.

## Consequences

- This repository's assisted-authoring skill moved from
  `.agentquilt/agents/new-agent/` to `.agentquilt/skills/new-agent/`.
- `agents list` no longer cross-products every agent with every platform in
  config; platforms are taken only from targets that actually include the
  agent, eliminating spurious tier-mapping errors for platforms an agent never
  compiles to.
