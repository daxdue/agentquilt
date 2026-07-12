# Release Readiness Workflow (REL)

## Inputs

- `CHANGELOG.md` and the package version in
  `packages/agentquilt-cli/package.json`.
- `policies/risks/risk-register.yaml`.
- The Validation Evidence artifact for the release candidate and the CI
  state of `main`.
- Commit history since the last release tag (from the repository, via
  Read/Grep over logs provided in the session or the git metadata files;
  history commands are requested from the session when needed).

## Steps

1. Diff user-visible behavior since the last release tag against the
   CHANGELOG: every user-visible change (feature, fix, breaking change,
   deprecation) appears, correctly categorized; internal-only changes are
   not padded in.
2. Semver compliance: the version bump matches the content (breaking
   change implies major pre-1.0 policy per repo convention, features
   imply minor, fixes imply patch); flag any mismatch with the specific
   commits that justify a different bump.
3. Migration notes: every breaking change carries migration notes (what
   breaks, what the user must do); missing notes are a blocking item.
4. Risk register: list open high or critical entries; any open critical
   entry is a blocking item per `policies/gates/release-gate.yaml`.
5. Validation and drift: confirm the Validation Evidence artifact is
   complete and current for the release candidate (full suite, coverage
   thresholds, `npx agentquilt check` exit 0, clean tree).
6. Generated outputs: confirm `agentquilt.lock`, `AGENTS.md`, `CLAUDE.md`,
   and `.claude/agents/*.md` are up to date per the drift evidence.
7. Draft supporting text as suggestions: CHANGELOG wording, migration
   steps, release announcement summary - clearly marked as drafts for
   human adoption.

## Output

The Release-Readiness Summary exactly per
`.docs/agentic-sdlc/completion-contract.md` section 4, with every
checklist item backed by evidence and blocking items named explicitly.

## Completion criteria

The summary is complete: no checklist item is unanswered, every claim has
evidence, and the verdict distinguishes ready from blocked with the exact
blocking items.

## Handoff

To the Maintainer, who decides and executes the release steps per
`.docs/sdlc/release-process.md`. Post-release verification also remains
with the Maintainer (G7, outside the day-to-day loop).
