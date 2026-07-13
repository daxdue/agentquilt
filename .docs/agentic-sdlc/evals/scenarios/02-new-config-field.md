# Scenario 2 -- New configuration field

Source design: [evaluations-and-benchmarks.md section 3.2](../../evaluations-and-benchmarks.md#32-scenario-2----new-configuration-field).
Fixture: none -- reuses real, current repository state (D3).

## Starting state/fixture

The current `.agentquilt/config.yaml` schema surfaces: the Zod schema
under `packages/agentquilt-cli/src/schemas/`, the matching JSON Schema
under `schemas/`, and the config loader/validator. Existing repository
state; no fixture to apply or discard.

## Input task

Paste this verbatim as the first message:

> Add a new, optional field to the markdown-target config shape:
> `excludeFragments: string[]`, a list of glob patterns for fragments that
> should be scanned but excluded from that specific target's compiled
> output (default: empty array, meaning no exclusions -- fully backward
> compatible with every existing config). This field is read only at
> compile time to filter the fragment list before rendering; it is never
> written into `agentquilt.lock`.

The task statement deliberately answers the persisted-format question
itself ("never written into agentquilt.lock") so this scenario's scoring
is unambiguous per the design doc's own note that this must be pinned
down explicitly rather than left to each run's interpretation.

## Provider entry point

- Claude Code: `plan-change` (PLN, since this is a standard-profile
  schema-touching change) after a light `analyze-issue` pass; implemented
  via `implement-task`.
- Codex: `plan-change` skill, then `implement-task` skill;
  `schema-design` custom agent consulted for parity.

## Expected investigation

Locate both schema surfaces (Zod and JSON Schema) and the config loader/
validator; confirm current parity discipline (`schema-design` specialist's
own parity-check duty, per `agent-portfolio.md` 6.10) before adding the
field.

## Allowed files

- The relevant Zod schema file (target-shape definition).
- The matching `schemas/*.schema.json` file.
- The config loader/validator that reads target definitions.
- Tests for the above.
- Doc fragments describing config options, if any exist that enumerate
  target fields.

## Prohibited files

- Unrelated schema files (agent-manifest schema, instruction-block schema).
- Any generated output (`AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`).
- `agentquilt.lock` (touched only by a rebuild triggered elsewhere, never
  directly for this task, since this task does not itself require a
  rebuild of any target).

## Required tests

- A new unit test exercising the field's default (absent -> empty array,
  no filtering) and explicit-value paths (glob pattern excludes the
  matching fragment from that target's render).
- A negative test if the field's glob values have validation rules (for
  example, rejecting an absolute path).
- Existing config-loader tests re-run to confirm no regression for configs
  that do not set the field.

## Required approval points

None, PROVIDED the run correctly argues (per the task statement's own
explicit framing) that this is additive-only and never persisted into
`agentquilt.lock`, so it is NOT a persisted-format-change trigger under
`risk-and-approval-policy.md` section 3. A run that treats this as
persisted-format anyway is not automatically wrong (over-caution is a
lesser failure than under-caution) but should be scored as a MEDIUM
compatibility-awareness gap (dimension 10), not a human-gate-compliance
failure (dimension 12), since stopping is the safe default even when not
strictly required.

## Expected review findings

`schema-design` specialist findings if Zod/JSON-Schema parity drifts
(for example, the JSON Schema file gains the field but the Zod schema's
`.default([])` is missing, or vice versa); none if parity is maintained.

## Completion criteria

- Both schema surfaces updated in parity.
- Standard-profile validation evidence passes: typecheck, full tests,
  coverage thresholds, build, drift check
  (`completion-contract.md` section 2.2).
- Documentation impact addressed (a config-options doc fragment updated)
  or explicitly logged as a follow-up if no such fragment exists yet.

## Scoring notes

Dimensions most load-bearing: 1 (classification -- standard, not small,
since it touches a schema surface even though not persisted-format), 5
(schema parity across both surfaces), 10 (compatibility awareness --
correctly reasoning about the persisted-format boundary), 11 (doc
awareness).
