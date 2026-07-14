# Pilot result: medium-feature (ESLint configuration) -- Claude Code -- 2026-07

Phase 10 pilot instance (design doc: `pilot-tuning-and-operating-model.md`
section 3.2, D5+D9). Not a Phase 8 numbered scenario -- filed here per D6
rather than under `evals/results/`, reusing `evals/results/TEMPLATE.md`'s
exact structure.

- Task: close the gap Phase 7's D8
  ([github-ci-integration.md](../github-ci-integration.md) section 9)
  identified -- `npm run lint` (`eslint src --ext .ts`) failed outright with
  "ESLint couldn't find a configuration file" because no `.eslintrc*` or
  `eslint.config*` existed anywhere in the repository. Scope, per the
  coordinator's explicit instruction: get `eslint src --ext .ts` actually
  running without erroring (a working baseline config), do NOT fix the 50
  files' worth of pre-existing Prettier formatting issues, do NOT make
  lint blocking in CI.
- Provider: Claude Code (orchestrator session).
- Provider version (coarse): Claude Code, 2026-07.
- Coarse date: 2026-07.
- Fixture applied: no (real repository state -- the actual, current,
  unconfigured `packages/agentquilt-cli/`).
- Outcome: finished -- the "no config exists" gap is fully closed; ESLint
  now runs and reports real findings instead of crashing. The command's own
  own exit code is 1 (10 real lint findings against real source), which is
  the correct and expected outcome, not a failure of this pilot instance's
  own task (the task was "make lint runnable," not "make the codebase
  lint-clean" -- the latter is explicitly out of scope per the coordinator's
  own instruction and per `test.yml`'s own `continue-on-error: true`
  treatment, unchanged by this instance).

## What was built

- `packages/agentquilt-cli/.eslintrc.json` -- a new file, using the legacy
  `.eslintrc` format (not flat config), matching the ESLint version actually
  installed in this workspace (`eslint@8.57.1`, root-hoisted via npm
  workspaces) and the already-declared, already-installed
  `@typescript-eslint/parser@6.x` / `@typescript-eslint/eslint-plugin@6.x`
  devDependencies (both present in `package.json` before this instance ran,
  confirmed via `grep` before writing the config -- **no new dependency was
  added**, so this instance does not trigger the new-dependency approval
  gate). Extends `eslint:recommended` and
  `plugin:@typescript-eslint/recommended`; scoped to `src` only (matching
  the `lint` script's own existing target, unchanged); `dist`, `node_modules`,
  `coverage` ignored. Two rules set deliberately non-default for this
  codebase's own current state, both justified inline as design choices, not
  silently accepted defaults: `@typescript-eslint/no-unused-vars` set to
  `warn` (not the plugin-recommended `error`) with an
  `argsIgnorePattern: "^_"` allowance (a common, low-friction convention for
  intentionally-unused parameters); `@typescript-eslint/no-explicit-any` set
  to `warn` (not `error`), since this codebase's existing code already uses
  `any` in several places (confirmed by the very findings below) and
  defaulting to `error` would make the FIRST run of a newly-added config
  immediately block-shaped rather than informational-shaped, which is
  exactly the "materially larger, differently-scoped change" the
  coordinator's own instruction said to avoid forcing in this instance
  (making the codebase clean, versus making linting possible at all).
- No other file was created or modified as part of this instance.
  `.github/workflows/test.yml`'s Lint step was confirmed unchanged
  (`continue-on-error: true`, already present from Phase 7's own D8
  resolution) -- read directly, not assumed.

## Pilot metrics (per design doc section 4)

| # | Metric | Observation |
| - | ------ | ------------ |
| 1 | Task completion rate | 1 of 1 -- the stated task ("get eslint running without erroring") completed on the first configuration attempt; no dependency conflict or config-format ambiguity was actually encountered in practice (see Notes for why this was easier than the coordinator's own instruction anticipated it might be). |
| 2 | First-pass test success | Yes -- `.eslintrc.json` worked correctly on the first `npm run lint` invocation with this exact config; no iteration was needed to fix a config-level error (parser errors, plugin-resolution errors, etc.). The 10 findings ESLint reports are expected, correct behavior (real code patterns matching real configured rules), not a config defect. |
| 3 | Number of human corrections | Zero -- no Maintainer/coordinator redirect was needed; the scope boundary (config only, no source fixes, no CI blocking change) was followed as instructed on the first attempt. |
| 4 | Valid review findings | N/A -- no independent reviewer was delegated to for this pilot instance (small-to-medium profile, no formal REV-stage gate triggered per `risk-and-approval-policy.md` section 3 -- adding a dev-tooling config file is not a public-interface, persisted-format, generated-output, or dependency-addition trigger). Self-verification only (see Commands run below). |
| 5 | False-positive review findings | N/A -- see above. |
| 6 | Scope-creep incidents | Zero. Only `.eslintrc.json` was created; no source file under `src/` was edited to fix any of the 10 reported findings, no Prettier-formatting pass was run, no CI workflow file was touched -- all three exclusions explicitly instructed and explicitly honored, confirmed via `git status --short`/`git diff --stat`. |
| 7 | Generated-file mistakes | Zero. No `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`, or `agentquilt.lock` was touched. `npx agentquilt check` re-run after this instance's own change reported zero drift (see Commands run) -- direct evidence, not an assumption, since a build-tooling change is exactly the kind of change that could plausibly (though did not, in this case) interact with the compiler's own file discovery. |
| 8 | Missed documentation changes | One real documentation-impact question was considered and resolved, not missed: whether `CLAUDE.md`'s own "Development Commands" section needed an update to mention the new lint config's existence. Judged NOT needed -- `CLAUDE.md` already lists `npm run lint`... wait, it does not list lint/format at all in its own Development Commands block (only build/test/CLI commands); this instance did not add one, since doing so would require editing a source fragment under `.agentquilt/agents/project/` and rebuilding, a larger, separately-scoped documentation change beyond "make eslint runnable" -- flagged here as a candidate follow-up (see Follow-up), not silently skipped. |
| 9 | Approval-boundary violations | Zero. Adding a dev-tooling lint config with zero new dependencies and zero CI-blocking-behavior change triggers no approval gate under `risk-and-approval-policy.md` section 3; correctly proceeded without stopping. |
| 10 | Cycle time | Not independently isolated from the rest of this segment's batch (same limitation as the documentation-task pilot instance's own metric 10) -- the investigation (confirm ESLint/typescript-eslint versions actually installed, confirm zero pre-existing config, confirm the `lint` script's exact target), the config authoring, and the four-command verification sequence (lint, build, test, check) together took well under the time budget of a small-to-medium bounded task, but no standalone wall-clock figure was recorded. |
| 11 | Provider-specific notes | Ran entirely on Claude Code (orchestrator session). No Codex-side equivalent run performed -- same disclosed gap as the documentation-task instance. |

## Notes

**"If this proves non-trivial... document what happened" -- it did NOT
prove non-trivial, and that itself is disclosed as a real finding, not
smoothed over to manufacture drama.** The coordinator's own instruction
anticipated dependency conflicts or config-format uncertainty as a
plausible outcome. In practice: `eslint@8.57.1` and
`@typescript-eslint/parser@6.17.0` / `@typescript-eslint/eslint-plugin@6.17.0`
were already present as declared, already-installed devDependencies
(confirmed via `grep -A20 devDependencies packages/agentquilt-cli/package.json`
and `cat node_modules/eslint/package.json` before writing any config) --
these versions were added to `package.json` before this repository's own
Phase 1 dead-code removal (unrelated to that removal) and never wired into
a config file until now. Because ESLint 8.57.1 still defaults to the legacy
`.eslintrc.*` config format (flat config, `eslint.config.js`, only becomes
the unconditional default in ESLint 9), and because the already-installed
`@typescript-eslint` v6 packages match the legacy config API exactly, there
was no version-compatibility decision to make -- the "obvious" choice was
also the only correct one given what was already installed. **This is
itself useful pilot evidence**: not every gap this repository's own D8/D7
findings describe is actually hard to close; this one was small,
low-judgment, and low-risk in practice, which argues (see Follow-up) for
distinguishing "cosmetic-severity, low-effort" backlog items like this one
from genuinely larger ones (the 50-file Prettier pass) even though Phase
7's own D8 finding originally grouped both under one label.

**The two ESLint rule severity choices (`no-unused-vars` and
`no-explicit-any` both set to `warn`, not the plugin's own recommended
`error`) are a real, disclosed design judgment call, not an oversight.**
Both are named explicitly in "What was built" above with their reasoning.
A future pass could tighten either or both to `error` once the underlying
`any`/unused-variable instances are cleaned up -- that cleanup is exactly
the kind of separately-scoped follow-up this instance's own boundary
(config only, no source fixes) intentionally left open.

## Commands run (verification)

- `npm run lint` (packages/agentquilt-cli) -- exit 1, 10 findings (2
  `prefer-const` errors, 8 `@typescript-eslint/no-explicit-any` warnings)
  across 3 files (`src/commands/build.ts`, `src/commands/check.ts`,
  `src/core/lockWriter.ts`). No config-resolution error. This is the
  correct, expected result -- the gap being closed is "no config exists,"
  not "the codebase is lint-clean."
- `npm run build` (packages/agentquilt-cli) -- clean, no errors.
- `npm test -- --run` (packages/agentquilt-cli) -- 227/227 tests passed,
  19/19 test files, no regression.
- `node packages/agentquilt-cli/dist/index.js check` (repository root) --
  `All targets up to date.`, exit 0, zero drift across `AGENTS.md`,
  `CLAUDE.md`, `agentquilt.lock`, and all 14 `.claude/agents/*.md` files.
- `git status --short` / `git diff --stat` (repository root) -- confirmed
  only `packages/agentquilt-cli/.eslintrc.json` was created; no other file
  touched by this instance.

## Follow-up

1. The 10 real lint findings this config now surfaces (2 `prefer-const`
   errors in `build.ts`/`check.ts`, 8 `no-explicit-any` warnings across 3
   files) are a genuine, small, separately-scoped follow-up candidate --
   fixing them is a natural next "low-risk bug"-shaped or small-refactor
   pilot instance for a future session, not done here per this instance's
   own explicit no-source-fixes boundary.
2. The 50-file Prettier formatting pass (Phase 7's D8, the other half of
   that finding) remains untouched and unattempted by this instance,
   exactly as instructed -- still a separate, larger follow-up.
3. Making the Lint CI step blocking (removing `continue-on-error: true`
   from `.github/workflows/test.yml`) remains explicitly out of scope and
   untouched -- should only happen after both the current 10 findings and
   the 50-file formatting pass are resolved, so the newly-blocking step
   does not turn every open PR red on day one (mirroring D5's own
   `npm audit` precedent reasoning in `github-ci-integration.md`).
4. `CLAUDE.md`'s own "Development Commands" section does not currently
   mention `npm run lint`/`npm run format` at all -- a candidate small
   documentation-fragment addition for a future pass (edit the relevant
   `.agentquilt/agents/project/` fragment, then `npx agentquilt build`),
   not made here since it is outside this instance's own bounded scope.
