# Regression Review Workflow (RGR)

## Inputs

- The full diff of the change.
- The validation runs so far (Return Handoffs, VER results).
- The Implementation Plan's expected generated-output and fixture effects.

## Steps

1. Define the regression scope from the diff: which behaviors, outputs,
   and interfaces could this change alter beyond its stated intent?
2. Generated-output audit: list every generated file in the diff
   (`AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`, `agentquilt.lock`)
   and trace each to its causing source change. Run `npx agentquilt check`
   and record the exit code; a nonzero exit or an untraceable generated
   diff is a BLOCKER.
3. Golden-file and fixture audit: for each changed file under
   `packages/agentquilt-cli/tests/fixtures/`, require the recorded root
   cause from the Return Handoff. Run the golden suite (standard vitest
   filter of `npm test`) and record the result. An intentional golden
   change needs the rationale and the human approval reference.
4. Public interface compatibility: if the diff touches
   `src/commands/`, `src/index.ts`, config parsing, or output formatting,
   compare command surface, flags, output shape, and exit-code semantics
   (0 success / 1 drift / 2 config or validation / 3 I/O) before and
   after. Record an explicit compatibility statement: unchanged, or
   changed with the public-interface approval reference.
5. Behavior deltas: scan the diff for changes the plan did not predict
   (altered defaults, reordered output, changed error text) and flag each.
6. High-risk profile: execute the compatibility verification the plan
   flagged (before/after CLI output, schema round-trips) and attach the
   evidence.

## Output

Regression findings in the format of
`.docs/agentic-sdlc/review-contract.md` section 5.2, with the executed
check commands and exit codes listed in the findings header, explicitly
covering: behavior deltas, generated-output drift, golden/fixture diffs,
and the compatibility statement.

## Completion criteria

RGR exit criteria: every generated-output and fixture change has a
recorded cause; `npx agentquilt check` passes; the compatibility statement
is recorded.

## Handoff

Findings to the correction loop if blocking; otherwise the change proceeds
to documentation review (DOC) and full validation (VAL). The compatibility
statement travels into the PR summary.
