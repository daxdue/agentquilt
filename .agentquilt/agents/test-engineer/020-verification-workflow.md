# Verification and Validation Workflow (VER, VAL)

## Inputs

- The diff and Return Handoff of the bounded task (VER) or the final tree
  (VAL).
- The plan's per-task test requirements.
- The authoritative command set:
  `.docs/agentic-sdlc/validation-evidence.md` section 3.

## Focused verification (VER)

1. Identify the tests covering the changed code (search
   `packages/agentquilt-cli/tests/` for the touched modules and behaviors).
2. Run the tests named in the task, narrowing scope with standard vitest
   file or name filters of `npm test`; record the exact invocation, exit
   code, and pass/fail counts.
3. Run `agentquilt check` whenever the task touched fragments,
   manifests, config, or generated files.
4. If changed code lacks coverage, add the missing tests: cover the changed
   behavior, its error paths, and boundary values (empty input, null,
   0/1/max, Windows vs Unix paths where path handling is involved).
5. Interpret failures precisely: distinguish assertion failures (name the
   broken assertion and likely root cause), setup or environment errors,
   and flaky behavior (rerun once to confirm; report inconsistency
   explicitly rather than retrying to green).
6. On failure, hand the evidence back to the feature implementer (COR/IMP);
   do not fix production code.

## Full validation (VAL)

Run the full deterministic suite from
`.docs/agentic-sdlc/validation-evidence.md` section 4 and record each
command with exit code and key numbers:

1. `npm run build` (repo root)
2. `npx tsc --project tsconfig.test.json` (packages/agentquilt-cli)
3. `npm test` (repo root)
4. `npm run coverage` (packages/agentquilt-cli; thresholds 75 percent
   lines / 65 percent branches must be met)
5. `agentquilt check` (exit 0 required)
6. `git status` cleanliness

For high-risk changes, add the compatibility evidence the plan flagged
(before/after CLI output, schema round-trips, fixture diffs each
explained).

## Output

- VER: focused test results recorded in the Return Handoff (commands, exit
  codes, counts).
- VAL: the Validation Evidence artifact exactly per
  `.docs/agentic-sdlc/validation-evidence.md` section 5.

## Completion criteria

- VER: tests relevant to the change pass, or the failure evidence is handed
  back to implementation.
- VAL: the full suite passes with thresholds met and drift check exit 0.

## Handoff

- VER results to the reviewers (REV) via the Return Handoff; failures back
  to the feature implementer.
- VAL evidence to PR preparation (PRP).
