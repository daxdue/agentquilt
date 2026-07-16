# AgentQuilt — v1.1 Addendum: Platform-Agnostic Agent Definitions

**Status:** Ready to build · **Extends:** v1 Specification · **Config schema version:** 1 (unchanged)

This addendum adds a second kind of compile target: **agent definitions**. Where v1 compiles fragments into a prose *document* (`AGENTS.md`, `CLAUDE.md`), v1.1 compiles a neutral agent definition into the **per-platform files each LLM provider expects** — `.claude/agents/<name>.md` for Claude Code, `.codex/agents/<name>.toml` + a registration stanza in `.codex/config.toml` for Codex, and so on via pluggable adapters.

Nothing in v1 changes. Document targets, normalization, fragment hashing, the lock, the CI drift check, and recovery all apply unchanged — because "canonical record → adapter → output file" is the same kind of pure, hashable function as "fragments → document." This addendum only adds new inputs (an `agent.yaml` sidecar), new outputs (adapter files), and the resolution rules between them.

Decision tags as in v1: **[LOCKED]** settled · **[v1.1 CHOICE]** decided here · **[DEFERRED]** out of scope.

---

## 1. Compiler model: front-end / back-end split **[LOCKED]**

The author writes one **canonical agent record** (the IR). At compile time, one **adapter** per target platform serializes that record into the platform's concrete file(s). This is a standard compiler front-end/back-end split and is the only honest way to be platform-agnostic: the neutral record is the front-end, the adapters are the back-ends.

```
agents/reviewer/                      canonical record           adapters → outputs
├── agent.yaml      ─┐                ┌─────────────┐            ┌─ claude → .claude/agents/reviewer.md
├── 010-role.md      ├─ compose ──▶   │ name, desc, │ ──fan-out─▶├─ codex  → .codex/agents/reviewer.toml
├── 020-criteria.md  │                │ model, body │            │          + [agents.reviewer] stanza
└── 030-output.md   ─┘                │ permissions │            └─ (future adapters: API-ready)
                                      └─────────────┘
```

### 1.1 Agents and subagents are one record type **[LOCKED]**

In both Claude Code and Codex a "subagent" is just another agent definition that happens to have its own model — there is no separate artifact and no parent→child link the platforms require (Claude auto-discovers agents from the directory; Codex registers them in `config.toml`). AgentQuilt therefore has **one** agent record type. Model selection is per-record. A primary agent does not declare its subagents; they are simply other agent directories. This keeps the model uniform and avoids inventing linkage the platforms don't use.

### 1.2 Document vs. agent-definition sources are distinct **[v1.1 CHOICE]**

A source directory is *either* document fragments *or* one agent definition, never both. The signal is the presence of **`agent.yaml`**: a directory containing `agent.yaml` is an agent definition; one without it is document fragments. An agent directory must not appear in a document target's `include`, and vice versa. (A shared-source mode — one definition feeding both a prose doc and agent files — is **[DEFERRED]**; it adds magic for little gain today.)

---

## 2. The agent source directory

```
agents/
└── reviewer/
    ├── agent.yaml          # structured metadata (the non-prose fields)
    ├── 010-role.md         # body fragments — compose into the system prompt
    ├── 020-criteria.md
    └── 030-output-format.md
```

- **Body** = the directory's `NNN-*.md` fragments, composed exactly as a v1 document body (same normalization §3, same ordering by filename prefix, joined by one blank line) **but with no generated header** — the composed text *is* the agent's system prompt.
- **Metadata** = `agent.yaml` (§3).
- Each body fragment is hashed per the v1 normalization rules. Editing one fragment bumps only this agent's version, not other agents'.

---

## 3. `agent.yaml` — the canonical record (non-body fields) **[v1.1 CHOICE: YAML]**

```yaml
# required
description: >
  Reviews a diff for correctness, security, and missing tests.
  Use after code changes, before opening a PR.

# optional — defaults to the directory name
name: reviewer

# model intent — shorthand string, or the expanded form below
model: balanced
# model:
#   tier: frontier            # frontier | balanced | fast | inherit
#   reasoning: high           # low | medium | high   (optional)
#   overrides:                # exact model per platform, escape hatch
#     codex: gpt-5-codex-max

# coarse, neutral capability level
permissions: read-only        # read-only | workspace | full   (default: read-only)

# platform-specific passthrough — emitted verbatim by that adapter only
x-claude:
  color: blue
  tools: [Read, Grep, Glob]   # overrides the permissions→tools default
x-codex:
  nickname_candidates: [Athena, Ada]
```

### 3.1 Canonical fields **[LOCKED set, values extensible]**

| field | required | meaning | maps to |
|---|---|---|---|
| `description` | yes | routing hint the platform uses to decide delegation | Claude `description`, Codex `[agents.*].description` |
| `name` | no (default = dir name) | stable identity | Claude `name`, Codex `name` |
| `model` | no (default = project `defaultModelTier`) | model intent as a **tier**, not a name | resolved per §4 |
| `permissions` | no (default `read-only`) | coarse capability | mapped per §5 |
| body (fragments) | yes | the system prompt | Claude markdown body, Codex `developer_instructions` |
| `x-<platform>` | no | one-sided fields with no neutral equivalent | passed through to that adapter only |

### 3.2 Core + extension design (why not pure lowest-common-denominator)

Forcing every provider's fields into one shared shape would either strip all power (intersection) or fake cross-platform meaning (union). Instead: a **canonical core** that genuinely maps everywhere, plus **`x-<platform>` extension blocks** (the OpenAPI-extension / ESLint-overrides pattern) for fields that exist on only one side. An `x-` block is emitted verbatim by its named adapter and ignored by all others. This is the only way to be agnostic in the core without lying about fidelity at the edges.

---

## 4. Model resolution **[v1.1 CHOICE]**

"Platform-agnostic" and "specify the model" conflict, because model names *are* platform-specific. Resolved by specifying **intent as a tier** and mapping tiers→models in config **as editable data** (model names rot constantly; localizing them to one table is the point).

### 4.1 Config additions

```yaml
# agentquilt.config.yaml
defaultModelTier: balanced
modelTiers:
  frontier: { claude: opus,   codex: gpt-5-codex-max }
  balanced: { claude: sonnet, codex: gpt-5-codex }
  fast:     { claude: haiku,  codex: gpt-5-mini }
```

(Claude aliases `opus`/`sonnet`/`haiku` are stable; Codex names are examples a team should pin to currently-available models. A team edits this one table when models change — no agent files are touched.)

### 4.2 Resolution algorithm — for a given `(agent, platform)`

1. If `model.overrides[platform]` is set → use that exact string. (Escape hatch for exactness.)
2. Else resolve the tier: `model.tier` if set, else `model` shorthand if a tier string, else project `defaultModelTier`.
3. If tier is `inherit` → **emit no model field**; the platform uses its session default.
4. Else look up `modelTiers[tier][platform]`. If absent → **config error** (`tier "frontier" has no mapping for platform "codex"`). Silent fallback hides misconfiguration.
5. `reasoning`, if set, maps to the platform's reasoning axis (§5) independently of the model.

A brand-new platform works the moment its adapter ships, with **zero edits to any agent** — authors only ever wrote tiers.

---

## 5. Permissions and reasoning mapping **[v1.1 CHOICE]**

### 5.1 Permissions

| neutral | Claude adapter | Codex adapter |
|---|---|---|
| `read-only` | `tools: Read, Grep, Glob` (no write/bash) | `sandbox_mode = "read-only"` |
| `workspace` | omit `tools` (inherit full set); `permissionMode` default | `sandbox_mode = "workspace-write"` |
| `full` | `tools` inherit; `permissionMode: acceptEdits` | `sandbox_mode = "danger-full-access"` |

`x-claude.tools` (or `x-claude.permissionMode`) overrides the Claude row entirely; `x-codex.sandbox_mode` overrides the Codex row. Default is **`read-only`** (least privilege; matches the "keep tool access tight" guidance — authors opt up to write access deliberately).

### 5.2 Reasoning

| neutral `reasoning` | Claude | Codex |
|---|---|---|
| `low` / `medium` / `high` | `effort` field (best-effort; omitted if unsupported by the installed Claude version) | `model_reasoning_effort` |

> **Known uncertainty:** Codex's `model_reasoning_effort` is well-documented; Claude's per-file `effort` frontmatter is listed among agent fields but less firmly documented than `model`/`tools`. The Claude adapter emits `effort` when `reasoning` is set and treats a rejection as non-fatal (omit + warn). Verify against the installed Claude Code version during the build.

---

## 6. Adapters

Each adapter is `(canonicalRecord, resolvedModel, config) → files`. Each carries its own **`ADAPTER_VERSION`** constant, so changing one adapter busts only its outputs (not document outputs, not the other adapter's).

### 6.1 Claude adapter **[v1.1 CHOICE]**

Output: `.claude/agents/<name>.md` (Markdown + YAML frontmatter; body is the system prompt verbatim).

```markdown
<!-- agentquilt: generated file — do not edit. version=sha256-… regenerate: agentquilt build -->
---
name: reviewer
description: Reviews a diff for correctness, security, and missing tests. Use after code changes, before opening a PR.
model: sonnet
tools: Read, Grep, Glob
color: blue
---
You are a senior code reviewer.

Review the most recent diff for correctness, security, and missing tests.

Report findings by severity: Critical, Warning, Suggestion. Be specific with file/line references.
```

- `model` omitted entirely when tier resolves to `inherit`.
- `tools` from §5 unless `x-claude.tools` overrides; remaining `x-claude.*` keys pass through into frontmatter verbatim.
- The HTML-comment header sits **above** the frontmatter so it doesn't break YAML parsing; it self-identifies the file as generated.

### 6.2 Codex adapter **[v1.1 CHOICE]**

Two outputs per agent:

**(a)** `.codex/agents/<name>.toml`

```toml
# agentquilt: generated file — do not edit. version=sha256-… regenerate: agentquilt build
name = "reviewer"
description = "Reviews a diff for correctness, security, and missing tests. Use after code changes, before opening a PR."
model = "gpt-5-codex"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
You are a senior code reviewer.

Review the most recent diff for correctness, security, and missing tests.

Report findings by severity: Critical, Warning, Suggestion. Be specific with file/line references.
"""
```

- `model` / `model_reasoning_effort` lines omitted when not set / `inherit`.
- `developer_instructions` is the composed body as a TOML multi-line string (escape `"""` if it ever appears in a body).
- `x-codex.*` keys pass through verbatim.

**(b)** A registration stanza injected into `.codex/config.toml` (§6.3).

### 6.3 Codex `config.toml` managed-region injection **[v1.1 CHOICE — the fragile part]**

Codex requires each agent to be registered with an `[agents.<name>]` stanza in the otherwise hand-maintained, shared `.codex/config.toml`. AgentQuilt owns **one bounded region** of that file and never touches anything outside it:

```toml
# ... user's own config.toml content, untouched ...

# >>> agentquilt:managed — generated, do not edit inside this block >>>
[agents.planner]
description = "Plans multi-step changes before implementation."
config_file = "./.codex/agents/planner.toml"

[agents.reviewer]
description = "Reviews a diff for correctness, security, and missing tests."
config_file = "./.codex/agents/reviewer.toml"
nickname_candidates = ["Athena", "Ada"]
# <<< agentquilt:managed <<<
```

Injection rules:

1. Locate the region by its exact sentinel lines. Replace **only** the region body with freshly generated stanzas, sorted by agent name. Preserve all bytes outside the sentinels exactly.
2. If no region exists → append one at EOF (preceded by one blank line).
3. If `.codex/config.toml` does not exist → create it containing only the region.
4. The region's normalized content is hashed and recorded in the lock; `agentquilt check` drift-checks **only the region**, so hand-edits outside it never trip the check and hand-edits *inside* it are caught.
5. Recovery is the universal one: `agentquilt build` regenerates the region.

This is the v1 "never hand-edit a generated artifact" rule applied to a *slice* of someone else's file. It is the most failure-prone adapter behavior; cover it with focused tests (no region, empty file, region present, user text adjacent to sentinels, user edit inside region).

### 6.3 AgentSkills adapter

Platform ID: `"agentskills"`. Output path: `.agents/skills/<name>/SKILL.md`.

AgentSkills is an open standard for portable, runtime-discoverable agent skills (https://agentskills.io). A skill is a directory with a `SKILL.md` file containing YAML frontmatter + Markdown instructions.

**Frontmatter mapping:**

| `agent.yaml` source | `SKILL.md` frontmatter | Behavior |
|---|---|---|
| `name` (normalized) | `name` | Converted to lowercase kebab-case; must match directory name |
| `description` | `description` | Required; passed through |
| `x-agentskills.license` | `license` | Optional; passed through |
| `x-agentskills.compatibility` | `compatibility` | Optional; passed through (e.g., "Requires Python 3.8+ and docker") |
| `x-agentskills.allowed-tools` | `allowed-tools` | Optional; space-separated string, experimental |
| `x-agentskills.metadata` | `metadata` | Optional; nested YAML object (author, version, etc.) |

**Name normalization rule:** Convert agent name to lowercase, replace non-`[a-z0-9-]` with `-`, collapse runs of `-`, trim leading/trailing `-`. Example: `My-PDF-Processor` → `my-pdf-processor`.

**Notes:**
- No `model` or `permissionMode` fields emitted — AgentSkills is platform-agnostic.
- The full skill body (assembled fragments) is emitted as Markdown after the frontmatter.
- AgentSkills does not define skill "types"; differentiation is by content and metadata.

Example agent definition:

```yaml
description: Extract and process PDF files
x-agentskills:
  license: Apache-2.0
  compatibility: "Requires pdfplumber and Python 3.8+"
  metadata:
    author: example-org
    version: "1.0"
```

Produces `.agents/skills/pdf-processor/SKILL.md`:

```yaml
---
name: pdf-processor
description: Extract and process PDF files
license: Apache-2.0
compatibility: "Requires pdfplumber and Python 3.8+"
metadata:
  author: example-org
  version: "1.0"
---

<assembled body fragments>
```

---

### 6.4 Adapter API and forward-compatibility **[v1.1 CHOICE]**

Adapters implement a small interface (`id`, `version`, `outputsFor(record, resolvedModel, config) → File[]`, optional `injectionsFor(...) → Region[]`). v1.1+ ships **Claude, Codex, and AgentSkills** concretely; the API is open so a new platform is added without touching core. Honest limit: an unknown future platform is unsupported until its adapter exists — there is no magic. Two mitigations, both **[DEFERRED]**: (a) a community/plugin adapter path; (b) an optional **neutral fallback emission** — a plain-prose description of each agent appended to a document target — so AGENTS.md-only tools get *something* for free.

---

## 7. Config schema additions

```yaml
version: 1
sourceDir: agents

defaultModelTier: balanced            # new (§4)
modelTiers:                           # new (§4)
  frontier: { claude: opus,   codex: gpt-5-codex-max }
  balanced: { claude: sonnet, codex: gpt-5-codex }
  fast:     { claude: haiku,  codex: gpt-5-mini }

targets:
  - kind: document                    # default when omitted (v1 behavior)
    output: AGENTS.md
    include: [_shared, backend]

  - kind: agent-definitions           # new
    agents: [reviewer, planner]       # explicit list, or "*" for every agent dir
    platforms: [claude, codex]        # which adapters to run
    # outputPaths:                    # optional per-platform path override
    #   claude: .claude/agents
    #   codex:  .codex/agents
```

Validation additions (fail build, exit 2): every name in `agents` resolves to a directory containing `agent.yaml`; every name in `platforms` is a known adapter; every referenced tier has a mapping for every requested platform; no two agents resolve to the same `name`.

---

## 8. Hashing, versioning, and the lock (additions)

Output-based, so it is robust to model-table and adapter changes (the recompiled files differ, so `check` catches drift regardless of why).

- **bodyHash** = Merkle root over the agent's body fragments' `(id:hash)` lines (as a v1 document body, minus header).
- **metaHash** = `sha256` of the **canonicalized** `agent.yaml` (parse → sort keys → stable JSON → hash), so reformatting or key reordering does not bump the version.
- **outputHash[p]** = `sha256` of each adapter's normalized emitted file(s) for platform `p`, including any injected region.
- **agentVersion** = `sha256(` `FORMAT_VERSION` + adapter versions + `name` + `bodyHash` + `metaHash` + sorted `p:outputHash[p]` `)`. Bumps on body, metadata, resolved-model, or adapter change — i.e. whenever real output would change.
- **target version** (agent-definitions) = `sha256` over sorted member `agentVersion`s.

Lock additions (`agentquilt.lock`), sorted, one self-contained record per agent:

```json
{
  "agents": [
    {
      "name": "reviewer",
      "dir": "agents/reviewer",
      "bodyFragments": ["agents/reviewer/010-role.md", "agents/reviewer/020-criteria.md"],
      "metaHash": "sha256-…",
      "version": "sha256-…",
      "outputs": [
        { "platform": "claude", "path": ".claude/agents/reviewer.md", "hash": "sha256-…" },
        { "platform": "codex",  "path": ".codex/agents/reviewer.toml", "hash": "sha256-…" },
        { "platform": "codex",  "path": ".codex/config.toml", "kind": "region", "hash": "sha256-…" }
      ]
    }
  ]
}
```

`agents` sorted by `name`; each agent's `outputs` sorted by `(platform, path)`. The Codex region is recorded as an output of `kind: "region"` so drift covers it.

---

## 9. CLI additions

| command | behavior |
|---|---|
| `agentquilt add agent <name>` | scaffold `agents/<name>/agent.yaml` + a starter `010-role.md`. |
| `agentquilt agents list` | print each agent and its **resolved** model per platform (catches tier-mapping gaps before CI). |
| `build` / `build --watch` / `check` | now also process `agent-definitions` targets and the Codex region; semantics and exit codes unchanged from v1. |

`.gitattributes` additions:

```gitattributes
.claude/agents/**   linguist-generated=true
.codex/agents/**    linguist-generated=true
# NOTE: do NOT mark .codex/config.toml generated — only a region is managed; the rest is the user's.
```

---

## 10. Risks and open questions (v1.1-specific)

- **`config.toml` injection is the sharp edge.** Owning a region inside a shared, hand-edited file is inherently more failure-prone than writing a whole file (Claude's model). Mitigation: strict sentinel matching, region-only drift check, deterministic regeneration, and the focused test matrix in §6.3.
- **These formats are young and moving.** Research found the official docs internally inconsistent (Codex conflates agents vs. skills; Claude's documented frontmatter differs from what `/agents` generates). Adapters are **living code** with ongoing maintenance cost — weigh that against the "set and forget" promise. Pin each adapter's assumptions behind its `ADAPTER_VERSION`.
- **Forward-compatibility has a hard floor.** Agnosticism is real for the *core*; a novel future format needs a new adapter. The neutral-fallback emission (§6.4) softens but does not remove this.
- **Permissions coarseness.** Three levels won't satisfy every power user; the `x-<platform>` escape hatch is the pressure-release valve, at the cost of some per-platform divergence in those agents.
- **Claude `effort` field support** is unverified per-version (§5.2); the adapter degrades gracefully but confirm against the target Claude Code version.

---

## Appendix — end-to-end agent example

`agents/reviewer/agent.yaml`
```yaml
description: Reviews a diff for correctness, security, and missing tests. Use after code changes, before opening a PR.
model: balanced
permissions: read-only
x-claude: { color: blue }
```

`agents/reviewer/010-role.md`
```markdown
You are a senior code reviewer.
```

`agents/reviewer/020-criteria.md`
```markdown
Review the most recent diff for correctness, security, and missing tests.
```

`agentquilt.config.yaml` (excerpt)
```yaml
defaultModelTier: balanced
modelTiers:
  balanced: { claude: sonnet, codex: gpt-5-codex }
targets:
  - kind: agent-definitions
    agents: [reviewer]
    platforms: [claude, codex]
```

`agentquilt build` produces: `.claude/agents/reviewer.md` (frontmatter `model: sonnet`, `tools: Read, Grep, Glob`, `color: blue`), `.codex/agents/reviewer.toml` (`model = "gpt-5-codex"`, `sandbox_mode = "read-only"`), and a `[agents.reviewer]` stanza inside the managed region of `.codex/config.toml` — all recorded in `agentquilt.lock` and verified by `agentquilt check`.
