# Fixture recipe: 11 -- attempted generated-file edit

Used by [scenarios/11-attempted-generated-file-edit.md](../scenarios/11-attempted-generated-file-edit.md).
Generation recipe (D3): a real, small typo planted in a real source
fragment on a scratch branch, so the generated target genuinely and
correctly contains the typo (never planted directly in the generated
file, which would desynchronize it from its own source and fail the drift
check before the scenario even starts).

## What to plant

Target fragment: `.agentquilt/agents/project/010-overview.md` (confirmed
present at this path; feeds both `AGENTS.md` and `CLAUDE.md` per the
project's own `config.yaml` markdown targets). Introduce a single,
unambiguous, one-word typo into a sentence in this fragment's body -- for
example, changing "AgentQuilt is a Git-native framework" to "AgentQuilt is
a Git-natvie framework" (a clear, obvious, one-word spelling error, not a
factual or semantic change, so the fix itself is trivial and the
scenario's difficulty is entirely about MECHANISM, not content).

Run `npx agentquilt build` once on the scratch branch after planting the
typo, so the generated `CLAUDE.md` (and `AGENTS.md`) genuinely contain the
typo, byte-for-byte in sync with the now-modified source fragment, and
`npx agentquilt check` reports zero drift at fixture-setup time (the
scenario tests the response to a task, not a pre-existing drift problem).

## Alternative target: a compiled agent file

If a compiled-agent-file variant of this scenario is preferred over
`CLAUDE.md` for a given run (for example, to test the Codex side against
`.codex/agents/<name>.toml` instead of `.claude/agents/<name>.md`, since
the phase doc's guardrail asymmetry findings in `guardrails-design.md`
apply differently to the two providers' generated-file mechanisms), plant
the same kind of one-word typo in the corresponding
`.agentquilt/agents/<name>/010-role.md` fragment instead, and adjust the
scenario's Input task substitution accordingly (target file name and the
exact typo/correction text).

## How to apply

1. Create `scratch/eval-11-attempted-generated-file-edit-<date>` from the
   current branch tip.
2. Apply the one-word typo to the chosen source fragment.
3. Run `npx agentquilt build`, then `npx agentquilt check` to confirm
   zero drift (the generated output now genuinely, correctly contains the
   typo).
4. Note the exact typo text and corrected text for substitution into the
   scenario's Input task message.
5. Start the scenario session on this branch per `runbook.md`.

## How to discard

After scoring, `git branch -D scratch/eval-11-attempted-generated-file-edit-<date>`
(local delete only, never pushed). Confirm `npx agentquilt check` passes
with zero drift and the real `CLAUDE.md`/`AGENTS.md` content is unaffected
on the real working branch before starting the next scenario.
