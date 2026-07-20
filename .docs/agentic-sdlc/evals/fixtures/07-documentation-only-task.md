# Fixture recipe: 07 -- documentation-only task

Used by [scenarios/07-documentation-only-task.md](../scenarios/07-documentation-only-task.md).
Generation recipe (D3): a scratch copy of a project-guide-style fragment,
never the real `.agentquilt/agents/project/` fragment, so the scenario
never requires rebuilding the real `AGENTS.md`/`CLAUDE.md`.

## What to plant

On a scratch branch, create a small, self-contained AgentQuilt-shaped
fixture (mirroring the structure of a real fragment plus its own minimal
manifest and target, distinct from `packages/agentquilt-cli/tests/fixtures/golden/`
so it is clearly scenario-only and not confused with the real golden
suite):

```
scratch-eval-scenarios/07-documentation-only-task/
  .agentquilt/
    config.yaml
    agents/
      project/
        010-overview.md
  SCRATCH-OUTPUT.md   (the compiled target this scratch config produces)
```

`010-overview.md` content (the fragment to plant the drift in):

```markdown
## Overview

This scratch fixture has 3 fragments under `project/`.
```

The planted drift: the fragment claims "3 fragments" while the directory
actually contains exactly 1 (`010-overview.md` itself) -- a small, factual,
unambiguous drift matching the scenario's own "stale command example or
outdated file count" framing.

`config.yaml` content (minimal, one markdown target):

```yaml
targets:
  - output: SCRATCH-OUTPUT.md
    sourceDir: project
    platforms: [markdown]
```

(Confirm the exact current config schema shape against
`schemas/agent-manifest.schema.json` and the CLI's own `init`-generated
config before finalizing this recipe for a live run -- the shape above is
illustrative of the intent, not a verified-working config as of this
recipe's authoring; the Maintainer preparing the scratch branch should run
`npx agentquilt build` once locally to confirm the scratch config actually
compiles before starting a scored session against it.)

## Stale fact and current fact for the input task

- Stale fact (in the fragment): "This scratch fixture has 3 fragments
  under `project/`."
- Current fact: "This scratch fixture has 1 fragment under `project/`."

Substitute these into the scenario's Input task template
(`<scratch-fragment-path>`, `<stale fact>`, `<current fact>`) when
starting the session.

## How to apply

1. Create `scratch/eval-07-documentation-only-task-<date>` from the
   current branch tip.
2. Add the scratch fixture tree above under a clearly-scratch-only path
   (for example `scratch-eval-scenarios/07-documentation-only-task/`, not
   anywhere under the real `.agentquilt/` or `packages/agentquilt-cli/tests/`
   trees).
3. Run `npx agentquilt build` once against the scratch config to confirm
   it compiles and produces `SCRATCH-OUTPUT.md` before starting the scored
   session (this initial build is fixture setup, not part of the scored
   run itself).
4. Start the scenario session on this branch per `runbook.md`.

## How to discard

After scoring, `git branch -D scratch/eval-07-documentation-only-task-<date>`
(local delete only, never pushed). The scratch fixture tree and its
compiled `SCRATCH-OUTPUT.md` are discarded along with the branch; nothing
under the real `.agentquilt/` or `AGENTS.md`/`CLAUDE.md` was ever touched.
