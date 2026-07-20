# Fixture recipe: 05 -- provider fixture change

Used by [scenarios/05-provider-fixture-change.md](../scenarios/05-provider-fixture-change.md).
Generation recipe (D3). The underlying `golden/front-matter/` and
`golden/multi-target/` fixture subtrees are real and reused as-is; only
the setup confirming this is a genuinely additive, intentional adapter
change is new, and no scratch branch is strictly required before the
session starts (the change itself IS the scenario's implementation task,
performed live during the scored run, not pre-planted).

## What to confirm before starting the scenario

`packages/agentquilt-cli/src/core/adapters/claude.ts` already has a
documented mechanism for passing through arbitrary `x-claude` manifest
keys verbatim into the compiled frontmatter (confirmed present in the
adapter's own emission logic, around the "remaining x-claude keys"
section). This means the task described in the scenario file ("emit a new
`memory` frontmatter key... whenever `x-claude.memory` is present,
mirroring how other `x-claude` keys already pass through verbatim") should
already be TRUE of the current adapter for a key it does not special-case
-- confirm this before running the scenario, since if `memory` already
passes through generically with no adapter change needed at all, the
scenario's premise ("update the adapter") would be moot and the scenario
should instead pick a key the adapter DOES special-case or currently
omits, so there is a genuine adapter change for the run to make.

**Before running this scenario for the first time**, verify against the
current `claude.ts` source exactly which frontmatter keys are emitted
unconditionally (name, description, model, tools, permissionMode, effort)
versus which pass through generically via the remaining-`x-claude`-keys
loop, and adjust the scenario's target key/condition in the input task
text if `memory` (or whichever key is named) turns out to already be
fully generic-passthrough with no code change required. This confirmation
step is a one-time check when the scenario is first prepared for a live
run, not a per-run fixture to reapply.

## Where the fixtures live

`packages/agentquilt-cli/tests/fixtures/golden/front-matter/` and
`golden/multi-target/` -- both real, existing subtrees. The scenario's own
completion criteria require the run to identify which specific fixture
files, if any, need their expected output updated as a consequence of the
adapter change, and to touch only those.

## How to apply

No scratch branch is required to SET UP this scenario (unlike scenarios
1, 4, 7, 8, 11, 12) -- the adapter change is the task itself, performed
live. However, since the scenario modifies real source
(`src/core/adapters/claude.ts`) and potentially real fixture files, run it
on a scratch branch anyway (`scratch/eval-05-provider-fixture-change-<date>`)
so the change is trivially discarded after scoring rather than needing a
manual revert of an adapter file plus however many fixture files the run
touched.

## How to discard

After scoring, `git branch -D scratch/eval-05-provider-fixture-change-<date>`
(local delete only, never pushed). Confirm `npx agentquilt check` passes
on the real working branch before starting the next scenario.
