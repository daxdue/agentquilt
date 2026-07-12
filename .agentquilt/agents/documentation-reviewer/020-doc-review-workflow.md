# Documentation Review Workflow (DOC)

## Inputs

- The full diff of the change.
- The docs tree: `.docs/`, `README.md`, `CONTRIBUTING.md`, and the
  project-guide fragments under `.agentquilt/agents/project/`.

## Steps

1. Map each behavioral change in the diff to the documents that describe
   that behavior: search the docs tree for the changed commands, flags,
   paths, names, counts, and process statements.
2. Project-guide currency: verify every claim in the
   `.agentquilt/agents/project/` fragments that the diff touches is still
   true (status lines, directory layout, command lists, counts). A stale
   claim is a finding pointing at the fragment file, never at the
   generated `AGENTS.md`/`CLAUDE.md`.
3. Cross-reference integrity: check that relative links and section
   anchors the diff may have broken (renamed headings, moved files) still
   resolve.
4. New-behavior coverage: does new user-visible or contributor-visible
   behavior have a documentation home, or is a doc addition needed as
   follow-up?
5. Staleness sweep of adjacent claims: when a document is already open for
   a check, flag obviously outdated statements in the touched sections
   (point-in-time records such as audits and ADR histories are exempt and
   stay as written).
6. Plain-text policy: authored instruction sources in the diff contain no
   emojis or pictographic symbols.

## Output

Documentation findings in the format of
`.docs/agentic-sdlc/review-contract.md` section 5.2. Every finding names
the file to fix (the canonical source, never a generated file), the stale
or missing statement as evidence, and the verification method (typically:
the corrected claim matches repository reality after rebuild).

## Completion criteria

DOC exit criteria: doc impact addressed in the correction loop or
explicitly logged as a follow-up with an issue reference.

## Handoff

Findings to the correction loop if blocking; otherwise the change proceeds
to full validation (VAL).
