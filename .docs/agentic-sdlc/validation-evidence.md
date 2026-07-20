# Agentic SDLC — Validation Evidence Contract

Date: 2026-07-12
Status: Active (Phase 2 deliverable of the agentic SDLC effort)

## 1. Purpose and when it applies

This contract defines what "validated" means for a change and how validation
is recorded so a human can trust it without rerunning everything. It applies
to focused verification (per bounded task), full validation (before PR), and
the completion checks of the small profile. Adjacent stages: consumes the
final tree; its artifact feeds the
[PR summary](completion-contract.md#3-artifact-format-pr-summary) and the
release-readiness summary.

## 2. Principles

1. **Deterministic only.** Validation consists of reproducible commands with
   exit codes. CI runs exactly this class of check and never calls a model
   (ADR-0012). Agent/LLM judgment is review, not validation, and lives in
   [review findings](review-contract.md).
2. **Evidence, not assertion.** "Tests pass" is not evidence; the command,
   exit code, and key numbers are.
3. **No invented commands.** Only the authoritative set below (from the
   [current-state audit](current-state-audit.md) section 2, which derives
   them from `package.json` and the CI workflows). New commands enter this
   table only via a change to those sources.

## 3. Authoritative commands

| Command | Where | Purpose |
| ------- | ----- | ------- |
| `npm install` | repo root | Install workspace dependencies |
| `npm run build` | repo root | `tsc` build of the CLI workspace |
| `npm test` | repo root | Full test suite (`vitest run`) |
| `npm run coverage` | `packages/agentquilt-cli` | Coverage with enforced thresholds: 75% lines / 65% branches (per `policies/gates/pr-quality-gate.yaml`) |
| `npx tsc --project tsconfig.test.json` | `packages/agentquilt-cli` | Typecheck including tests |
| `npx agentquilt build` | repo root | Regenerate all targets + lock (CI equivalent: `node packages/agentquilt-cli/dist/index.js build`) |
| `npx agentquilt check` | repo root | Drift gate; exit 0 clean, 1 drift, 2 config/validation error, 3 I/O (CI invokes `node packages/agentquilt-cli/dist/index.js check`) |
| `npm run lint` | `packages/agentquilt-cli` | ESLint. Note: not currently a CI step (audit gap, Phase 7); optional evidence until then |
| `npm version <type>` / `npm publish` | release only, human only | See [release-process.md](../sdlc/release-process.md) |

Focused test runs may narrow scope with standard vitest file/name filters of
`npm test`; the evidence records the exact invocation used.

## 4. Validation levels

| Level | When | Required commands |
| ----- | ---- | ----------------- |
| Focused verification | per bounded task (VER) | The tests named in the task, plus `npx agentquilt check` whenever the task touched fragments, manifests, config, or generated files |
| Completion checks (small profile) | before PR | `npm run build`, `npm test`, `npx agentquilt check` (CI adds typecheck and coverage) |
| Full validation (standard, high-risk) | before PR (VAL) | `npm run build`; `npx tsc --project tsconfig.test.json`; `npm test`; `npm run coverage` (thresholds met); `npx agentquilt check`; plus `git status` cleanliness |
| Full evidence package (high-risk) | before PR/merge | Full validation, plus compatibility verification evidence for each flagged trigger (e.g. before/after CLI output, schema round-trip, fixture diffs each explained) |

## 5. Artifact format: Validation Evidence

```markdown
## Validation Evidence

- Task/PR: <ref>  Level: focused | completion | full | full-evidence
- Tree state: <commit/branch>; `git status` clean: yes/no

### Commands

| Command (exact) | Where run | Exit code | Key results |
| --------------- | --------- | --------- | ----------- |
| npm test | root | 0 | <N>/<N> tests passed |
| npm run coverage | packages/agentquilt-cli | 0 | <x>% lines / <y>% branches (thresholds 75/65) |
| npx agentquilt check | root | 0 | no drift |

### Failures (if any)

- <command>: <relevant output>; disposition: <fixed in <commit> | open>

### Generated-output changes

- <file>: changed because <named source change>; produced by rebuild, not
  hand-edit; drift check passes. (Or: "no generated files changed".)

### Fixture / golden / baseline changes

- <fixture>: expected output changed because <root cause>; approved by
  <decision ref>. (Or: "none".)

### Not run

- <check>: <why it was skipped and what covers the gap (e.g. CI)>
```

## 6. Rules for generated output and fixtures

- Any diff in `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`, or
  `agentquilt.lock` must appear in the Generated-output section with its
  causing source change. A diff with no named cause fails validation.
- `npx agentquilt check` exit 0 is mandatory whenever those files or their
  sources changed; drift is fixed by rebuilding, never by editing outputs
  ([branching-strategy drift section](../sdlc/branching-strategy.md)).
- Fixture/golden/baseline diffs are never accepted automatically; each needs
  the explanation and approval described in
  [risk-and-approval-policy section 6](risk-and-approval-policy.md#6-baseline-and-snapshot-changes).

## 7. Entry and exit criteria

- Entry: the tree the evidence describes is the tree under review (no
  pending local edits).
- Exit: every required command for the level ran with exit code 0 (or a
  failure is recorded with disposition), and the generated-output and
  fixture sections are complete. Evidence with an unexplained diff or a
  missing required command is not exit-eligible.
