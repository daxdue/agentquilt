# AgentQuilt — v1 Specification

**Status:** Ready to build · **Schema version:** 1 · **Format version:** `1`

A precompiler for AI agent instruction files. Authors edit small Markdown **fragments** under `agents/`; AgentQuilt assembles them into one or more committed Markdown **targets** (e.g. `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/*`). Per-fragment content hashing and a derived target version eliminate the merge-conflict and version-bump classes that plague a single shared instruction file.

This document is the authoritative reference for the v1 build. Decisions marked **[LOCKED]** are settled; **[v1 CHOICE]** are decided here and may be revisited only with reason; **[DEFERRED]** are explicitly out of scope.

---

## 1. Core model

### 1.1 Concepts

- **Fragment** — one small Markdown file, the unit of authoring and the unit of versioning. One concern per fragment (role, build commands, testing, style, …).
- **Agent** — a directory of fragments under the source dir: `agents/<agent>/`.
- **Target** **[LOCKED]** — the central abstraction. A target is `(output path, ordered list of includes, optional format)`. Targets are why AgentQuilt is both *multi-agent* (each agent → its own file) and *platform-agnostic* (same fragments → `AGENTS.md` + `CLAUDE.md` + Cursor rules + Copilot instructions). Nothing about any platform is baked into the compiler; a platform is just an output path.
- **Manifest / lock** (`agentquilt.lock`) — generated record of every fragment's hash and every target's composition and version. Used for verification, auditability, and consumer pinning.

### 1.2 Directory layout

```
repo/
├── agents/                       # sourceDir (configurable)
│   ├── _shared/                  # fragments shared across agents
│   │   ├── 010-tone.md
│   │   └── 020-safety.md
│   ├── backend/
│   │   ├── 010-role.md
│   │   ├── 020-build-commands.md
│   │   └── 030-testing.md
│   └── frontend/
│       ├── 010-role.md
│       └── 020-style.md
├── agentquilt.config.yaml        # config (JSON also accepted)
├── agentquilt.lock               # generated — do not hand-edit
├── .claude/agents/
│   ├── backend.md                # generated target — do not hand-edit
│   └── frontend.md               # generated target — do not hand-edit
├── .cursor/rules/
│   ├── backend.mdc               # generated target — do not hand-edit
│   └── frontend.mdc              # generated target — do not hand-edit
├── .github/copilot-instructions.md # generated target — do not hand-edit
└── .gitattributes
```

`_shared` reuse is **[v1 CHOICE]** included — it is low-cost and prevents duplicating base rules across every agent.

---

## 2. Fragments

### 2.1 Naming and identity

- Path: `agents/<agent>/<NNN>-<slug>.md`
  - `<NNN>` — zero-padded integer ordering prefix. **Use gaps of 10** (`010`, `020`, `030`) so fragments can be inserted between without renumbering.
  - `<slug>` — kebab-case description.
- **Fragment ID** = the POSIX relative path from repo root, e.g. `agents/backend/030-testing.md`. The ID is the fragment's stable identity in the lock and in target composition.
- A fragment without an `NNN` prefix is permitted but emits a warning and sorts after all prefixed fragments (lexicographic by full filename).

> **Known v1 limitation:** because the ordering prefix is part of the path, reordering a fragment by renaming changes its ID (it reads as remove + add in the lock and in Git). Acceptable for v1. The deferred fractional-ordering mode (§9) removes this by moving order into front-matter.

### 2.2 Front-matter (optional)

A fragment **may** begin with a YAML front-matter block delimited by `---`:

```markdown
---
tags: [testing, ci]
---
Run the full suite with `npm test` before every commit.
```

- Recognized keys in v1: `tags` (array of strings, reserved for the future topic index; parsed and stored in the lock but does not affect output).
- Front-matter is **stripped from output** and **excluded from the fragment hash** (§3). Editing tags therefore does **not** bump any target version — metadata must never move the consumed artifact.
- Unknown keys are preserved in the lock's fragment record but otherwise ignored; they do not error.

---

## 3. Normalization and hashing **[LOCKED]**

Normalization is applied to a fragment's **body** (post front-matter strip) before both hashing and assembly, so the hash always matches what is emitted.

### 3.1 Normalization algorithm

Given raw file bytes, produce the normalized body:

1. Decode as UTF-8. Strip a leading UTF-8 BOM if present.
2. If the content begins with a YAML front-matter block (`---\n … \n---\n`), remove it; retain the remainder as the body.
3. Replace every `\r\n` and lone `\r` with `\n`.
4. Trim trailing newlines and trailing blank lines, then append exactly one `\n` so the body ends with a single newline.
5. **Do not** alter in-line trailing whitespace. Two trailing spaces is a Markdown hard line-break; stripping it would change meaning.

### 3.2 Hashes

- **Fragment hash** = `sha256(normalizedBody as UTF-8)`, lowercase hex, stored as `sha256-<hex>`.
- **Target version** = a Merkle-style root over the target's ordered composition, binding both content and order, and the tool's format identity so a format change busts stale artifacts:

  ```
  input =  FORMAT_VERSION + "\n"
         + OUTPUT_FORMAT  + "\n"
         + for each fragment in resolution order:
             fragmentId + ":" + fragmentHash + "\n"

  targetVersion = "sha256-" + hex(sha256(input))
  ```

  `FORMAT_VERSION` is the constant `"1"`. `OUTPUT_FORMAT` is the target's format id (default `"markdown"`). Display may truncate to the first 12 hex chars; the lock and header always store the full value.

### 3.3 Cross-platform determinism

- All sorting is **byte/code-point lexicographic** on UTF-8 (`Buffer.compare` / code-unit compare), never `localeCompare`. Locale-aware sorting is non-deterministic across machines and is forbidden in the compiler.
- The normalization above is the authoritative defense against CRLF drift. `.gitattributes` (§7) reinforces it in the working tree.

---

## 4. Targets, resolution, and assembly

### 4.1 Resolution order

A target's `include` is an ordered list whose entries are agent names (incl. `_shared`). The composed fragment list is:

1. For each include, in config order,
2. take all fragments in `agents/<include>/`, sorted byte-lexicographically by full filename (the `NNN` prefix drives order),
3. concatenate these per-include lists in include order.

Example: `include: [_shared, backend]` → all `_shared` fragments (by prefix), then all `backend` fragments (by prefix).

### 4.2 Assembly output format **[LOCKED]**

Clean assembled Markdown. **No inline source markers** — they are noise for an LLM consumer.

- Join normalized fragment bodies with exactly one blank line (`\n\n`) between them.
- Prepend a single HTML-comment header (invisible when rendered, one line to a model) and one blank line:

  ```
  <!-- agentquilt: generated file — do not edit. version=<full-target-version> · source: agents/ · regenerate: npx agentquilt build -->

  <assembled body>
  ```

- The file ends with exactly one trailing newline.
- The header is the only non-content addition. It pairs with `linguist-generated` to self-identify as generated and gives consumers a version to pin and audit.
- **[DEFERRED]** An optional, off-by-default flag may later emit fragment-boundary markers as HTML comments to support the virtual single-file view; v1 emits none.

---

## 5. Configuration

**[v1 CHOICE]** `agentquilt.config.yaml` is the documented default for hand-authoring comfort; `agentquilt.config.json` is also accepted. Format is selected by extension. (YAML adds one parse dependency; if a zero-dependency build is preferred, ship JSON-only first and add YAML in a point release — the schema is identical.)

### 5.1 Schema

```yaml
version: 1                       # config schema version (required)
sourceDir: agents                # optional, default "agents"
targets:                         # required, >= 1
  - output: .claude/agents/backend.md    # required, repo-relative path
    include: [_shared, backend]          # required, order significant
    format: markdown                     # optional, default "markdown"
  - output: .cursor/rules/backend.mdc
    include: [_shared, backend]
    format: cursor-mdc
  - output: .github/copilot-instructions.md
    include: [_shared, backend, frontend]
    format: markdown
```

### 5.2 Presets

A preset is sugar that supplies a default `output` (and possibly `format`). Presets carry **no** compiler-special behavior — they only fill defaults. Starter set:

| preset | default output |
|---|---|
| `agents-md` | `AGENTS.md` |
| `claude` | `CLAUDE.md` |
| `cursor` | `.cursor/rules/<agent>.mdc` |
| `copilot` | `.github/copilot-instructions.md` |
| `gemini` | `GEMINI.md` |
| `agentskills` | `.agents/skills/<agent>/SKILL.md` |

### 5.3 Validation rules (fail the build, exit 2)

- `version` present and known.
- At least one target.
- No two targets share an `output`.
- No `output` resolves inside `sourceDir`.
- Every `include` names an existing directory under `sourceDir`.
- An empty agent directory in an `include` is a warning, not an error (it contributes nothing).

---

## 6. Manifest / lock (`agentquilt.lock`) **[v1 CHOICE]**

JSON (zero parse dependency), pretty-printed two-space, arrays sorted for localized diffs. Structured Cargo-style so adding a fragment inserts one self-contained record at a sorted position rather than touching shared lines.

```json
{
  "lockfileVersion": 1,
  "formatVersion": "1",
  "fragments": [
    { "id": "agents/_shared/010-tone.md", "hash": "sha256-…", "bytes": 412, "tags": [] },
    { "id": "agents/backend/010-role.md", "hash": "sha256-…", "bytes": 980, "tags": [] }
  ],
  "targets": [
    {
      "output": "AGENTS.md",
      "format": "markdown",
      "fragments": ["agents/_shared/010-tone.md", "agents/backend/010-role.md"],
      "version": "sha256-…"
    }
  ]
}
```

- `fragments` sorted by `id`; `targets` sorted by `output`; each target's `fragments` list is in resolution order (not sorted).
- `bytes` is the normalized body length.
- The lock is generated; never hand-edited. `merge=union` is set on it in `.gitattributes` as a free win where honored, but nothing depends on that (GitHub web merges ignore it — see §7).

---

## 7. Enforcement

The authoritative gate is **CI**; everything client-side is fast feedback, not a wall.

### 7.1 `.gitattributes`

```gitattributes
# normalize line endings everywhere — primary CRLF defense in the working tree
* text=auto eol=lf
agents/**/*.md text eol=lf

# mark generated outputs (collapses diffs, signals "do not edit")
AGENTS.md            linguist-generated=true
CLAUDE.md            linguist-generated=true
GEMINI.md            linguist-generated=true
.cursor/rules/**     linguist-generated=true
.github/copilot-instructions.md linguist-generated=true
.agents/skills/**    linguist-generated=true

# lock: structured to rarely conflict; union as a free win where honored
agentquilt.lock      linguist-generated=true merge=union
```

> Note: GitHub's PR **web merge** ignores user-defined merge drivers (community request open, unresolved as of mid-2026). `merge=union` therefore only helps on local/GitLab merges. The design does **not** rely on it; conflict-resistance comes from per-fragment files + a structured lock + recompile-recovery.

### 7.2 CI check (the real gate)

`agentquilt check` recompiles in memory and compares against the committed outputs and lock; it exits non-zero on any drift, including a hand-edited output, a stale output, or a stale lock. Wire it as a required status check behind branch protection.

```yaml
# .github/workflows/agentquilt.yml
name: agentquilt
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npx agentquilt@1 check
```

`check` is git-independent (it diffs its own recompile against disk), which is more robust than `build && git diff --exit-code`; the latter remains a documented equivalent for non-GitHub CI.

### 7.3 Recovery — the one escape hatch

Whatever a merge mangles — stale output, odd lock state, hash mismatch — the universal fix is:

```
npx agentquilt build && git add -A && git commit
```

Deterministic regeneration means there is exactly one recovery path, and CI tells you precisely when you need it.

---

## 8. CLI **[LOCKED: Node]**

Package `agentquilt` (npm name reserved). TypeScript, ESM, Node ≥ 18. Invoked via `npx agentquilt` or a project devDependency.

### 8.1 v1 commands

| command | behavior |
|---|---|
| `agentquilt init` | scaffold `agentquilt.config.yaml`, an `agents/` tree with one example agent, and `.gitattributes`. |
| `agentquilt build` | compile every target, write all outputs and the lock. |
| `agentquilt build --watch` | recompile affected targets on fragment/config change (fast local feedback). |
| `agentquilt check` | recompile in memory; exit `1` on any drift vs. committed outputs/lock. CI gate. |

### 8.2 Exit codes

`0` success / no drift · `1` drift detected (`check`) · `2` config or validation error · `3` I/O error.

### 8.3 Flags (common)

`--config <path>` (override config location) · `--cwd <dir>` · `--quiet` / `--verbose`.

---

## 9. Out of scope for v1 **[DEFERRED]**

Tracked, intentionally not built now; none block the core:

- VS Code extension and the **virtual single-file view** (edit what looks like one file; routes edits back to fragments).
- **Fractional / LexoRank ordering** in front-matter (removes the rename-to-reorder limitation in §2.1).
- **LLM coherence lint** — advisory CI comment flagging cross-fragment contradictions (must stay non-blocking).
- **Auto-compile bot** — GitHub App that recompiles and pushes the artifact back onto the PR branch instead of failing.
- **`split` / `merge` / `add`** authoring commands (make granularity a cheap refactor).
- Topic index surfacing related fragments on review; `CODEOWNERS`-per-fragment guidance.
- Compiled single-file binary distribution.

---

## 10. Spike — validate before building the polish

Two one-day spikes de-risk the assumptions the whole design rests on. Treat them as acceptance gates.

1. **Hash determinism across OSes.** Build the normalizer + hasher only. Run on macOS, Linux, and Windows against the same fragments (including files saved with CRLF and with a BOM). **Pass:** identical `sha256-…` for every fragment and identical target versions on all three.
2. **Concurrent-PR auto-merge.** Create two branches; each *adds* a new fragment to the same agent *and edits a different existing fragment*. Merge both into main. **Pass:** zero Git conflicts in fragments; `agentquilt check` is clean after a single `agentquilt build` on the merge result.

If either spike fails, fix the model before writing the rest of the compiler.

---

## Appendix A — End-to-end example

`agents/_shared/010-tone.md`
```markdown
Be concise. Prefer direct, technical language over hedging.
```

`agents/backend/010-role.md`
```markdown
---
tags: [role]
---
You are the backend service agent for this repo. Work in `src/server`.
```

`agents/backend/020-build-commands.md`
```markdown
Build: `npm run build`. Test: `npm test`. Lint must pass before commit.
```

`agentquilt.config.yaml`
```yaml
version: 1
targets:
  - output: AGENTS.md
    include: [_shared, backend]
  - output: CLAUDE.md
    include: [_shared, backend]
```

Generated `AGENTS.md`
```markdown
<!-- agentquilt: generated file — do not edit. version=sha256-9f3c…a1 · source: agents/ · regenerate: npx agentquilt build -->

Be concise. Prefer direct, technical language over hedging.

You are the backend service agent for this repo. Work in `src/server`.

Build: `npm run build`. Test: `npm test`. Lint must pass before commit.
```

Note the `tags` front-matter is stripped from output and excluded from the hash, so adding or changing tags never changes the target version.
