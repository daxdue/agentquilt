# Changelog

All notable changes to AgentQuilt are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.1.0] — 2026-07-01

Initial release. Core compiler, CLI, adapters, and meta-agent framework.

### Added

**CLI (`agentquilt`)**

- `agentquilt init` — scaffold a new project with `agentquilt.config.yaml`, `agents/` directory, and `.gitattributes`. Supports `--platform` flag with `claude`, `agentskills`, `cursor`, `copilot`, `gemini`.
- `agentquilt build` — compile all targets (document and agent-definitions), write adapter outputs, and write `agentquilt.lock`.
- `agentquilt check` — detect drift between source and disk; exits 1 if any output or lock is stale. CI-safe.
- `agentquilt agents add <name>` — scaffold a new agent directory with `agent.yaml` and `010-role.md`.
- `agentquilt agents list` — list all agents and their resolved model per platform.

**Compiler**

- Deterministic fragment compilation: fragments are byte-lex sorted (no locale-awareness), normalized to LF, and SHA-256 hashed before assembly.
- Front-matter stripping: YAML front-matter in instruction blocks is excluded from compiled output but captured in the lock file (tags, metadata).
- Merkle-style target versioning: each target version is a SHA-256 hash over the ordered fragment hashes and format version, binding content, order, and format identity.
- Multi-target support: the same fragments can be included in multiple targets (e.g., `AGENTS.md` and `CLAUDE.md` from the same source).
- Shared fragments: `agents/_shared/` fragments can be included in any target without duplication.

**Adapters**

- **Claude adapter** — compiles agent definitions to `.claude/agents/<name>.md` in Claude Code's required format (YAML frontmatter + plain-text body). Strips emojis and Markdown headers from body per generated-file policy.
- **AgentSkills adapter** — compiles agent definitions to `.agents/skills/<name>/SKILL.md` for AgentSkills.io compatibility.
- Adapter plugin interface: `registerAdapter` / `getAdapter` / `knownAdapters` for third-party adapters.

**Lock file**

- `agentquilt.lock` records all fragment hashes, target versions, and agent output records. Generated deterministically; never hand-editable.
- `diffLock` detects added, removed, and modified fragments and targets between two lock states.

**Schemas (Zod + JSON Schema)**

- `agentquilt.config.yaml` — config schema with version, sourceDir, model tiers, targets (document and agent-definitions kinds), platform presets.
- `agent.yaml` — agent manifest schema: description, name, model, permissions, `x-<platform>` extensions.
- `agentquilt.lock` — lock file schema with fragment records, target locks, and agent output records.
- `eval-case.schema.json` — eval case schema (prompt-presence, llm-judge, semantic, regex, custom types) for future eval runner.
- `gate-policy.schema.json` — CI gate policy schema.

**Meta-agents (`.agents/` and `.claude/agents/`)**

- 43 meta-agents scaffolded across five categories: governance (8), SDLC (10), STLC (10), release (6), internal (9).
- All 46 compiled agent files discoverable and usable in Claude Code via `.claude/agents/`.
- Five gate policies defined: intake, requirement, architecture, pr-quality, release.
- AI assistance model enforced in all agents per ADR-0004: agents may draft, review, and recommend; humans retain all approval and merge authority.

**CI / GitHub Actions**

- `test.yml` — runs on all PRs and pushes to main: typecheck, tests, coverage thresholds, build, drift check.
- `pr-review.yml` — PR quality gate (G5): runs the same checks and posts a review reminder suggesting agent invocation via Claude Code.
- `intake.yml` — issue intake gate (G0): validates required fields (Problem, Owner, Risk) and posts a triage reminder.
- `release.yml` — manual release gate: full test + coverage + build + drift + risk register check before release.

**Documentation and governance**

- v1 spec (`agentquilt-v1-spec.md`) and v1.1 addendum (`agentquilt-v1.1-addendum.md`) as authoritative implementation references.
- 9 Architecture Decision Records (ADRs 0001–0004 and supplementary): project structure, YAML format, generated file policy, AI assistance authority model.
- SDLC lifecycle (7 stages, G0–G7 gates), branching strategy, release process, and governance model documented.
- STLC test strategy, eval strategy, security testing, and regression strategy documented.
- Risk register with 6 identified risks (4 mitigated at release; RISK-005 open, medium).
- Emoji policy: no emojis or emoticons in generated files; enforced by adapter layer.

### Fixed

- Claude adapter output now starts with `---` (YAML frontmatter) rather than an HTML comment, enabling agent discovery in Claude Code.
- `x-claude` context blocks removed from compiled meta-agents for v1.1 spec compliance.
- Repository structure aligned with v1/v1.1 specs (CLI binary renamed from `agentctl` to `agentquilt`, package paths corrected).
- Planning and strategy documents updated to reference correct CLI command names.

### Security

- Path traversal via `include` field in config: `validateConfig()` now resolves each include with `path.resolve(sourceDir, includeName)` and rejects any path that escapes `sourceDir`. Covered by `tests/security.test.ts`.

---

## Notes

This is a pre-v1.0 release (`0.x`). Breaking changes to manifest format, lock format, or CLI behavior may occur in minor versions until v1.0.0, with ADR documentation required for each.

The following are explicitly deferred to future releases:
- `agentquilt eval` command and eval runner
- `agentquilt lint` (semantic fragment validation)
- `agentquilt diff` (semantic diff across Git refs)
- Codex adapter (`.codex/agents/<name>.toml`)
- `agentquilt build --watch` (file-watching mode)
- npm publish automation (currently manual — see release process docs)
