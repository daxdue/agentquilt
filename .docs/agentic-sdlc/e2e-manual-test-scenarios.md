# End-to-end manual test scenarios: refactor/agentic-sdlc-boundary-cleanup

Status: living checklist, created 2026-07-14.

This branch carries the full 11-phase agentic-SDLC effort (agent portfolio
rationalization, Claude Code pipeline, Codex pipeline, guardrail hooks,
GitHub/CI integration, evals, multi-agent parallelism docs, pilot/operating-
model docs) plus the pipeline-agent-drift-check follow-up. `npm test` and
`agentquilt check` have been run clean many times throughout that effort,
but nothing on this branch had been exercised as a human would actually use
it -- typing a skill name in a real Claude Code session, tripping a hook by
accident, opening a real PR -- before this document existed.

`packages/website` has zero changes on this branch (confirmed via
`git diff main...refactor/agentic-sdlc-boundary-cleanup -- packages/website`)
and is out of scope here.

Two kinds of entries:

- **Section A** -- scriptable, non-interactive. Run directly as part of
  producing this document; results below are real output from this pass,
  not placeholders.
- **Section B** -- requires a live provider session (Claude Code or Codex)
  or a real GitHub PR/issue. Consistent with this effort's standing rule
  that live provider runs are Maintainer-initiated, never scripted by the
  orchestrator or an executor -- these are left for the Maintainer's own
  pass. Status column starts at `NOT YET RUN`.

## Section A -- run and recorded 2026-07-14

### CLI command surface

| Scenario | Command | Expected | Result |
|---|---|---|---|
| List compiled agents | `agentquilt agents list` | 14 agents, all platform `claude`, model `claude-sonnet-4-6` | PASS -- 14/14 listed correctly |
| List skills | `agentquilt skills list` | No AgentQuilt-managed skills (pipeline skills are hand-authored per ADR-0012, not compiled) | PASS -- "No skills found." as expected |
| Drift check | `agentquilt check` | All 16 targets (AGENTS.md, CLAUDE.md, 14 `.claude/agents/*.md`) match, plus `agentquilt.lock` | PASS -- 16/16 matched, exit 0 |
| Build idempotency | `agentquilt build` re-run, then `git status --short` / `git diff --stat` | Zero diff -- a rebuild from unchanged sources produces byte-identical output | PASS -- both commands returned empty |

### Guardrail hooks -- Claude Code (`.claude/hooks/pretooluse-guard.sh`)

| Scenario | Payload | Expected | Result |
|---|---|---|---|
| Scoped agent, allowed prefix | `repository-analyst` running `git log -5` | Pass-through (no output, no deny) | PASS |
| Scoped agent, disallowed command | `repository-analyst` running `npm install` | Deny, D2 per-agent guard reason | PASS -- denied with correct reason string |
| Chaining-bypass attempt | `repository-analyst` running `git log && rm -rf /` | Deny, D2 chaining guard reason (the bypass fixed in Phase 10 segment 4) | PASS -- denied, chaining guard fired |
| Out-of-scope agent_type | `feature-implementer` running `npm install` | Pass-through -- hook only scopes 4 named agents | PASS |

### Guardrail hooks -- Codex (`.codex/hooks/pretooluse-guard.sh`)

| Scenario | Payload | Expected | Result |
|---|---|---|---|
| Absolute-rule command | `git push origin main` | Deny, D1 absolute-rule guard reason | PASS |
| Absolute-rule command, chained after an allowed one | `git log && npm publish` | Deny -- substring denylist matches anywhere in the string, chaining doesn't evade it | PASS |
| Ordinary allowed command | `npm test` | Pass-through | PASS |

### Native `permissions.deny` (`.claude/settings.json`)

| Scenario | Check | Expected | Result |
|---|---|---|---|
| Deny rules present | Parse `settings.json`, count `permissions.deny` entries | Non-empty, covering generated files / publish-release / secret files | PASS -- 29 rules present, sample confirmed (`Edit(/AGENTS.md)`, `Write(/AGENTS.md)`, `Edit(/CLAUDE.md)`, ...) |

**Section A summary: 11/11 scenarios PASS.** `npm test` (227/227) and
`npm run build` re-run clean at the end of this pass as well.

## Section B -- Maintainer's own interactive pass (NOT YET RUN)

### Claude Code (requires a real Claude Code session in this repo)

| # | Scenario | Expected |
|---|---|---|
| B1 | Invoke `/analyze-issue` on a real or sample issue | Produces a Repository Investigation, classifies risk, does not start implementation |
| B2 | Invoke `/plan-change` following B1 | Produces an ordered Implementation Plan with risk flags |
| B3 | Invoke `/implement-task` for one bounded task from B2 | Executes exactly that task, runs focused verification, produces a Return Handoff |
| B4 | Invoke `/review-tree` on a small diff | Fans out to specialist reviewer agents, produces findings, does not fix them |
| B5 | Invoke `/fix-ci` against a deliberately broken build/test | Diagnoses and fixes the deterministic failure |
| B6 | Invoke `/develop-issue` end to end on a small real change | Full loop runs without a human re-explaining context at each stage |
| B7 | Invoke `$prepare-pr` | Prints a PR Summary from session artifacts; confirm it never runs `git push` or `gh pr create` itself |
| B8 | Invoke `$release-readiness` | Prints a Release-Readiness Summary; confirm it never bumps version/publishes |
| B9 | Spot-check 2-3 of the 14 agents via explicit `@agent-name` delegation | Each responds within its documented role/permission scope |

### Codex (requires a real Codex session in this repo, trusted per `~/.codex/config.toml`)

| # | Scenario | Expected |
|---|---|---|
| B10 | Invoke `repository-explorer` (the renamed `repository-analyst` counterpart) | Produces the same class of evidence-backed investigation as Claude Code's `repository-analyst` |
| B11 | Invoke `regression-reviewer` or `deterministic-output` (the two documented residual-risk, workspace-write agents) | Runs its permitted checks (`npm test`, `npx agentquilt check`) but stays within the commands its own `developer_instructions` documents -- confirm no attempt to exceed that scope |
| B12 | Invoke 2-3 of the remaining agents | Each responds within its documented role/`sandbox_mode` |

### GitHub-only (requires a real PR or issue on the actual repository)

| # | Scenario | Expected |
|---|---|---|
| B13 | Open a real PR | The PR Quality Gate comment bot posts, correctly listing required vs. informational checks including the new "Pipeline agent drift check" step as informational |
| B14 | Open one issue against each of the 6 issue-form templates (bug, documentation, feature, provider-compatibility, refactoring, release-task) | Each form renders with correct required/optional fields per `intake-gate.yaml` |
| B15 | Open an issue missing a required intake field | `intake.yml`'s missing-field comment fires |
| B16 | Open an issue with all required fields | `intake.yml`'s triage-reminder comment fires, pointing at `github-provider-handoff.md` |
| B17 | Manually trigger `release.yml` | Readiness report prints; confirm it touches no version file, CHANGELOG, or registry |

---

Fill in Section B's status as each item is actually run. This document is
not a gate on merging -- it's the record of what has and hasn't been
exercised by a human before this branch is trusted at full scale.
