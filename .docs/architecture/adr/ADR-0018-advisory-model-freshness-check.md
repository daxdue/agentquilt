# ADR-0018: Advisory Model-Freshness Check, Kept Outside the Deterministic Build Path

## Status

Accepted

## Context

`modelTiers` in `.agentquilt/config.yaml` maps tier names (`balanced`,
`frontier`, `fast`) to concrete model identifiers per platform. Per the v1.1
addendum (`.docs/agentquilt-v1.1-addendum.md` section 4), this mapping is
deliberately committed, human-maintained config data rather than something
resolved dynamically at build time, because "model names rot constantly;
localizing them to one table is the point."

Enabling the `codex` platform on the `agent-definitions` target (alongside
`claude`) surfaced a gap in that design: nothing in AgentQuilt ever told a
maintainer that a committed model id had gone stale. In practice this
matters more for Codex than for Claude — Claude's tier aliases
(`opus`/`sonnet`/`haiku`) are comparatively stable, while Codex model names
have churned every few weeks (visible in a local Codex CLI installation's
own `~/.codex/config.toml` `[notice.model_migrations]` table, e.g.
`gpt-5.1-codex` → `gpt-5.1-codex-max` → `gpt-5.2-codex` → `gpt-5.4`, and
onward). A stale `codex` model id in `.agentquilt/config.yaml` would silently
propagate into every generated `.codex/agents/*.toml` file and only surface
as a confusing runtime failure for whichever contributor's Codex CLI first
rejects it.

Two designs were considered and rejected:

1. **Resolve `codex` model ids live at `build`/`check` time.** This directly
   conflicts with the locked determinism principle (CLAUDE.md: "the same
   manifest + blocks always produce identical Markdown, enabling
   reproducible builds"). CI has no Codex account or local CLI state to
   resolve against, and two contributors on different CLI versions or
   accounts would compute different "canonical" output for identical
   source — which also defeats `agentquilt check`'s drift detection, since
   there would no longer be a single correct answer to check against.
2. **Query a live model-list API.** No such stable, documented interface
   exists. `codex --help` has no `models` subcommand; the only available
   source is `~/.codex/models_cache.json`, an undocumented internal cache
   file the CLI happens to write opportunistically, not a public contract.

## Decision

Add `agentquilt agents check-models`, a new, explicitly advisory command:

- It reads `config.modelTiers` and, for every `(platform, model)` pair an
  agent actually resolves to (via the existing `resolveModel()`, the same
  function `agents list` already uses), checks it against that platform's
  local CLI cache **if one is known** (`src/core/modelCatalog.ts` — today,
  only `codex`, via `~/.codex/models_cache.json`, respecting `$CODEX_HOME`).
- A platform with no registered cache reader (e.g. `claude`) is reported
  `SKIPPED`, not `WARN` — absence of a check is not evidence of staleness.
- Cache reads never throw. A missing, unreadable, or malformed cache file is
  `SKIPPED`, exactly like an unregistered platform — the command degrades to
  "nothing to report" rather than failing.
- The command is never invoked from `build` or `check`, and is never added
  to `.github/workflows/*` — it has no CI role, since CI has no local CLI
  cache to read from, and its result must never gate a build.
- `.agentquilt/config.yaml` remains the single deterministic source of truth
  for what model id actually gets compiled into output. `check-models` never
  writes to it; a maintainer who sees a `WARN` still edits the config by
  hand and re-runs `agentquilt build`, same as today.

## Consequences

Positive:

- A maintainer running `agentquilt agents check-models` locally (any time
  after the Codex CLI has populated its own cache) gets an early, low-cost
  signal that a committed model id may have rotted, without AgentQuilt
  taking on any dependency on live model data for its actual outputs.
- The determinism and reproducible-build guarantees are unaffected: `build`
  and `check` never read `check-models`' output or any local CLI cache.

Negative / accepted limitations:

- Coverage is inherently partial and best-effort: it depends on an
  undocumented cache file that may not exist, may be stale itself, or may
  omit a valid-but-not-yet-cached model id (a false `WARN` is possible). The
  command's own output says so explicitly.
- No equivalent exists for `claude` today; if Claude's aliases stop being
  stable, this ADR's registry (`modelCatalogReaders`) is the extension
  point, not a reason to revisit the "advisory only" decision.
