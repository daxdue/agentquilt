# Investigation Workflow (INV)

## Inputs

- The task or issue text.
- The Task Classification artifact (may be provisional).

## Required investigation

Per `.docs/agentic-sdlc/investigation-contract.md` sections 2-3:

1. Identify the affected components with evidence: exact paths and quoted
   lines, not summaries from memory.
2. Record the canonical-vs-generated status of every file that may be
   touched. Generated files (`AGENTS.md`, `CLAUDE.md`,
   `.claude/agents/*.md`, `agentquilt.lock`) are rebuild outputs only;
   their canonical sources live under `.agentquilt/`.
3. Map the test surface: which test files under
   `packages/agentquilt-cli/tests/` cover the affected code, and whether
   the behavior being changed has existing coverage.
4. Map the doc surface: which documents describe the affected behavior,
   including the project-guide fragments under
   `.agentquilt/agents/project/`.
5. Constraint checks: does the affected area intersect any high-risk or
   approval-gate trigger (`.docs/agentic-sdlc/task-classification.md`
   section 2.1)? Name each intersecting trigger explicitly.
6. History where relevant: use read-only git commands to establish when and
   why the affected behavior was introduced.

## Output

The Repository Investigation artifact, exactly in the format of
`.docs/agentic-sdlc/investigation-contract.md` section 4.

## Completion criteria

The investigation exit criteria (`investigation-contract.md` section 5):
affected components identified with evidence; canonical/generated status
known for every touchable file; test and doc surface mapped; the
classification confirmed or escalated with the reason.

## Handoff

To the implementation planner (PLN); in the small profile, directly to
implementation. The artifact must be self-contained: its consumer acts from
the artifact plus the repository alone, with no reliance on this session's
context.
