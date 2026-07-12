# Schema Change Review Workflow

## Inputs

- The diff of the schema surfaces: `schemas/*.schema.json` and
  `packages/agentquilt-cli/src/schemas/*.ts`.
- Persisted instances of the format: golden fixtures, example configs,
  user-facing documentation of the format.
- The Implementation Plan's compatibility claims.

## Checks per changed field or type

1. Breaking change? (field rename, type change, removal, constraint
   tightening)
   - If yes: a migration path is required and the version impact must be
     stated; the persisted-format approval gate applies.
2. New required field?
   - If yes: a default value is needed, or an explicit plan for existing
     data on disk.
3. Validation completeness?
   - The new or changed field has bounds, an enum, a pattern, or a type
     constraint; nothing is accepted as bare `unknown` without a recorded
     reason.
4. Backward compatibility?
   - Can data written by the previous version still be read?
   - Can data written by the new version be handled by tooling that only
     knows the old shape (or is the incompatibility declared)?

## Parity check (JSON Schema vs Zod)

Compare the touched types field-by-field across both surfaces:
`schemas/*.schema.json` (language-neutral reference) and the Zod schemas
(runtime enforcement). Names, optionality, enums, defaults, and
constraints must agree; any divergence is a finding
(`.docs/agentic-sdlc/review-contract.md` section 4, item 5). A change
applied to only one surface is incomplete.

## Fixture sweep

Find persisted instances of the old shape in
`packages/agentquilt-cli/tests/fixtures/` and example material; each one
the change invalidates must be accounted for in the plan.

## Output

Specialist findings in the format of
`.docs/agentic-sdlc/review-contract.md` section 5.2, concluding with a
per-field compatibility verdict: breaking, additive, or cosmetic, each
with evidence.

## Completion criteria

Every changed field has a verdict; parity is confirmed or a parity finding
issued; migration requirements for breaking changes are stated.

## Handoff

Findings to the correction loop alongside REV; advisory notes to the
implementation planner when consulted at PLN.
