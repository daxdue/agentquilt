# Restructure Mapping — Meta-Agent Adoption Baseline

Date: 2026-07-11
Phase: 1 (Boundary Cleanup and Legacy Removal), segment 1
Status: Record of the uncommitted working-tree restructure, written BEFORE the
baseline commit so the pre-restructure source layout (reachable only at HEAD
`acb27fc` until that commit) is documented.

## Purpose

The working tree carries a large uncommitted restructure: the categorized
`.agentquilt/meta-agents/` tree and `.agentquilt/skills/new-agent/` were
deleted, and the compiled `.claude/agents/*.md` outputs were re-adopted (via
`agentquilt init` adoption mode, v0.1.1 behavior) as flattened canonical
sources under `.agentquilt/agents/<name>/`. This document maps every
pre-restructure source path to its post-restructure location and records what
the lossy adoption changed or dropped. It verifies and pins down the
characterization in the Phase 0 audit
([current-state-audit.md](current-state-audit.md), section 0).

## Config change

`.agentquilt/config.yaml` was rewritten from eight targets to one:

- Before (HEAD): `AGENTS.md` (include: project), `CLAUDE.md` (include:
  project), one `agent-definitions` target for `reviewer`, one
  `agentskills` target for `skills/new-agent`, and four `agent-definitions`
  targets enumerating the meta-agents by category (governance, sdlc, stlc,
  release, internal) with `sourceDir: meta-agents`.
- After (working tree): a single wildcard `agent-definitions` target
  (`agents: "*"`, `platforms: [claude]`) over `sourceDir: .agentquilt/agents`.
- `defaultModelTier: balanced` was commented out (agents without `model:` now
  inherit the platform selection); the `fast` tier was pinned to
  `claude-haiku-4-5-20251001`.

## Agent mapping (46 agents)

Every meta-agent moved from `.agentquilt/meta-agents/<category>/<name>/` to
`.agentquilt/agents/<name>/`. No names collided during flattening; the
category is no longer represented anywhere in the source path or manifest.

### Former governance (8)

| Pre-restructure source | Post-restructure source | Fragment changes |
| --- | --- | --- |
| meta-agents/governance/gatekeeper/ | agents/gatekeeper/ | none (010-role, 020-governance-workflow) |
| meta-agents/governance/policy-compliance/ | agents/policy-compliance/ | none |
| meta-agents/governance/prompt-injection-test/ | agents/prompt-injection-test/ | none |
| meta-agents/governance/risk-register/ | agents/risk-register/ | 020-risk-classification.md renamed to 020-risk-classification-workflow.md (heading-derived) |
| meta-agents/governance/secret-leakage-detection/ | agents/secret-leakage-detection/ | 020-patterns.md renamed to 020-secret-pattern-scan.md |
| meta-agents/governance/security-review/ | agents/security-review/ | 020-threat-assessment.md renamed to 020-threat-assessment-test-generation.md; body split into 030-test-security-test-ts.md, 040-risky-unvalidated-front-matter-could-override-metadata.md, 050-user-controlled-yaml.md, 060-attacker-payload.md (heading-derived split artifacts); absorbed formatting artifacts (extra blank lines in fenced blocks) |
| meta-agents/governance/supply-chain-risk/ | agents/supply-chain-risk/ | none |
| meta-agents/governance/traceability/ | agents/traceability/ | none |

### Former SDLC (10)

| Pre-restructure source | Post-restructure source | Fragment changes |
| --- | --- | --- |
| meta-agents/sdlc/adr-writer/ | agents/adr-writer/ | 020-adrs.md renamed to 020-adr-validation-generation.md |
| meta-agents/sdlc/ambiguity-detector/ | agents/ambiguity-detector/ | 020-patterns.md renamed to 020-ambiguity-patterns-to-flag.md |
| meta-agents/sdlc/architecture/ | agents/architecture/ | 020-review.md renamed to 020-architectural-review-checklist.md |
| meta-agents/sdlc/code-review/ | agents/code-review/ | 020-review-guidelines.md renamed to 020-code-review-guidelines.md |
| meta-agents/sdlc/developer-experience/ | agents/developer-experience/ | none |
| meta-agents/sdlc/documentation/ | agents/documentation/ | none |
| meta-agents/sdlc/implementation-planning/ | agents/implementation-planning/ | none |
| meta-agents/sdlc/product-discovery/ | agents/product-discovery/ | none (020-triage-workflow.md kept) |
| meta-agents/sdlc/requirements-analyst/ | agents/requirements-analyst/ | 020-validation.md renamed to 020-requirements-validation-checklist.md |
| meta-agents/sdlc/schema-design/ | agents/schema-design/ | 020-validation.md renamed to 020-schema-change-review.md |

### Former STLC (10)

| Pre-restructure source | Post-restructure source | Fragment changes |
| --- | --- | --- |
| meta-agents/stlc/compatibility-test/ | agents/compatibility-test/ | none |
| meta-agents/stlc/defect-triage/ | agents/defect-triage/ | none |
| meta-agents/stlc/eval-designer/ | agents/eval-designer/ | body split: 020-eval-workflow.md plus new 030-example-eval-case.md, 040-example-baseline-interaction.md; absorbed formatting artifacts in fenced blocks |
| meta-agents/stlc/golden-file-test/ | agents/golden-file-test/ | 020-workflow.md renamed to 020-golden-file-test-workflow.md |
| meta-agents/stlc/performance-test/ | agents/performance-test/ | none |
| meta-agents/stlc/qa-strategy/ | agents/qa-strategy/ | none |
| meta-agents/stlc/regression-scope/ | agents/regression-scope/ | none |
| meta-agents/stlc/semantic-regression/ | agents/semantic-regression/ | 020-detection.md renamed to 020-semantic-regression-detection.md |
| meta-agents/stlc/test-automation/ | agents/test-automation/ | none |
| meta-agents/stlc/test-design/ | agents/test-design/ | none |

### Former release (6)

| Pre-restructure source | Post-restructure source | Fragment changes |
| --- | --- | --- |
| meta-agents/release/changelog/ | agents/changelog/ | none |
| meta-agents/release/evidence-collector/ | agents/evidence-collector/ | none |
| meta-agents/release/migration-guide/ | agents/migration-guide/ | none |
| meta-agents/release/post-release-review/ | agents/post-release-review/ | none |
| meta-agents/release/release-manager/ | agents/release-manager/ | none |
| meta-agents/release/versioning/ | agents/versioning/ | none |

### Former internal (10)

All ten map `meta-agents/internal/<name>/` to `agents/<name>/` with the shared
fragment renamed from `020-internal-coordination.md` to
`020-internal-coordination-workflow.md` (heading-derived): main-orchestrator,
agent-registry, conflict-detector, agent-behavior-reviewer,
agent-documentation, agent-migration, definition-architect,
instruction-block-author, instruction-refactoring, prompt-compiler-guardian.

### User agent: reviewer (modified in place)

`agents/reviewer/` existed before and after, but the adoption merged its two
fragments: `020-criteria.md` was deleted and its full content appended to
`010-role.md`. The `name: reviewer` manifest field was dropped. Compiled
output is unchanged in content; the fragment granularity was lost.

### Newly adopted: test-runner (previously unmanaged)

`.claude/agents/test-runner.md` was hand-authored and unmanaged at HEAD; the
adoption created `agents/test-runner/` (agent.yaml + single 010-role.md) and
brought the file under compiler management. Semantics changed silently:

- Tools narrowed from a broad hand-authored list (Agent, Cron tools, Skill,
  ToolSearch, WebFetch, WebSearch, task tools, Read, MCP resource tools, etc.)
  to `permissions: read-only` (Read, Grep, Glob). The agent can no longer
  execute tests, which is its entire purpose (audit risk R5; Phase 3 work).
- `memory: project` frontmatter dropped (no manifest representation).
- `model: sonnet` (provider alias) became `model: balanced` (tier mapping to
  claude-sonnet-4-6 — effectively equivalent today, but now tier-indirected).
- `name:` frontmatter field dropped, as for all adopted agents.

## Systematic losses (all 44 former meta-agents)

- **Category structure**: the governance/sdlc/stlc/release/internal grouping
  exists nowhere in the working tree; this document and the Phase 0 audit
  (section 6) are the record of it.
- **Manifest `name:` field**: dropped from every adopted `agent.yaml`; agent
  identity is now directory-name-only. (HEAD manifests carried explicit
  `name:` fields; descriptions were already the boilerplate "Meta-agent for
  <category> workflow - <name>" at HEAD, so no description content was lost.)
- **Curated fragment names**: replaced by heading-derived names where the
  original name differed from the body heading (see per-agent tables), and
  multi-section bodies were split into numbered heading-derived fragments
  (eval-designer, security-review).
- **Formatting artifacts**: eval-designer and security-review sources absorbed
  extra blank lines inside fenced code blocks from the compiled output.

## Not readopted (orphaned or dropped)

| Pre-restructure source | Post-restructure state | Disposition (Maintainer decisions, 2026-07-11) |
| --- | --- | --- |
| `.agentquilt/agents/project/` (10 fragments, 010-overview through 100-package-and-links) | Deleted; `AGENTS.md`/`CLAUDE.md` targets removed from config; both files orphaned and stale | Restore fragments and targets in Phase 1 segment 1, with stale status content corrected |
| `.agentquilt/agents/_shared/` (010-tone.md, 020-safety.md) | Deleted | Not restored: unreferenced at HEAD by any target or manifest (mentioned only in documentation prose); recoverable from pre-restructure history if needed |
| `.agentquilt/skills/new-agent/` (agent.yaml, 010-purpose, 020-workflow, 030-authoring-guidelines; permissions: workspace, model: inherit) | Deleted; `agentskills` target removed; compiled `.agents/skills/new-agent/SKILL.md` orphaned and stale (references the pre-restructure config layout) | Retire: SKILL.md deletion approved in principle, executed in Phase 1 segment 2 after the removal gate; recreate in Phase 4 |

## Recoverability

Until the baseline commit lands, pre-restructure content is reachable at HEAD
(`acb27fc`), e.g. `git show acb27fc:.agentquilt/meta-agents/stlc/eval-designer/agent.yaml`.
After the baseline commit, the same paths remain reachable at commit `acb27fc`
permanently; this mapping exists so nobody has to rediscover the
correspondence.
