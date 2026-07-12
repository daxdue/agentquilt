# Agentic SDLC — Completion Contract

Date: 2026-07-12
Status: Active (Phase 2 deliverable of the agentic SDLC effort)

## 1. Purpose and when it applies

This contract defines when a change is done, what its PR must carry, and
what a release must carry. It closes the handoff chain: it consumes the
classification, plan, review findings, and validation evidence, and produces
the two artifacts a human acts on — the PR Summary (merge decision) and the
Release-Readiness Summary (release decision). Merging and releasing are
human acts, always ([ADR-0004](../architecture/adr/ADR-0004-ai-assistance-authority-model.md),
[governance](../sdlc/governance.md),
[risk-and-approval-policy](risk-and-approval-policy.md#2-absolute-rules-no-exceptions-any-profile)).

## 2. Definition of done by profile

A change is done when every line below holds. CI re-verifies the
deterministic subset; evidence in the PR covers the rest.

### 2.1 Small profile

- Focused tests for the change pass.
- Completion checks pass: `npm run build`, `npm test`,
  `npx agentquilt check` (see
  [validation-evidence section 4](validation-evidence.md#4-validation-levels)).
- An independent diff review produced findings (possibly none); no open
  BLOCKER/HIGH.
- No generated-file or fixture diff without a recorded cause.
- Compact PR summary present (classification line, what/why, tests run).

### 2.2 Standard profile

All of the small profile plus:

- Approved plan (where approval was required) referenced from the PR.
- Review, regression review, and documentation review closed per the
  [review-contract exit criteria](review-contract.md#7-entry-and-exit-criteria).
- Full validation evidence: typecheck, full tests, coverage thresholds
  (75% lines / 65% branches), build, drift check.
- Documentation impact addressed (including project-guide fragments) or
  logged as a follow-up issue.

### 2.3 High-risk profile

All of the standard profile plus:

- Every gate trigger has a recorded human approval referenced from the PR.
- ADR included in the same PR when required.
- Specialist review findings closed.
- Compatibility verification evidence for each flagged trigger (public CLI,
  schemas/persisted formats, deterministic output).
- Merge performed by the Maintainer with the full evidence package in view.

## 3. Artifact format: PR Summary

This is the PR description. Sections marked (std+) may be omitted in the
small profile; everything else is always present.

```markdown
## PR Summary

- Linked issue/task: <ref>
- Classification: <class> (<trigger summary or "no triggers">)
- Branch type: <per CONTRIBUTING/branching-strategy>

### What and why

<implementation summary; key design decisions and their reasons>

### Plan (std+)

- Plan: <ref>  Approval: <not required | decision ref>
- Deviations from plan: <none | list with reasons>

### Tests executed

<from Validation Evidence: command, exit code, key numbers>

### Generated-output changes

<file: causing source change; rebuilt, drift check exit 0 | "none">

### Fixture / golden changes

<fixture: root-cause explanation + approval ref | "none">

### Compatibility and docs impact

- Public CLI behavior: <unchanged | change + approval ref>
- Persisted formats / schemas: <unchanged | change + approval ref>
- Docs: <updated: paths | follow-up: issue ref | none needed>

### Review findings and resolutions (std+)

| Finding | Severity | Resolution |
| ------- | -------- | ---------- |

### Limitations and follow-ups

- <known gaps, deferred work with issue refs, or "none">
```

## 4. Artifact format: Release-Readiness Summary

Produced by the release reviewer (read-only — never publishes, tags, or
pushes) before the Maintainer executes
[release-process.md](../sdlc/release-process.md). It makes the G6 checklist
evidence-backed instead of asserted.

```markdown
## Release-Readiness Summary

- Proposed version: <x.y.z> (<patch|minor|major> per the versioning policy
  in release-process.md)  Date: <date>
- Release scope: <changes since last release, by PR>

### Deterministic checks on main

| Check | Command | Result |
| ----- | ------- | ------ |
| Tests | npm test | <N>/<N>, exit 0 |
| Typecheck | npx tsc --project tsconfig.test.json | exit 0 |
| Coverage | npm run coverage | <x>% lines / <y>% branches (>= 75/65) |
| Build | npm run build | exit 0 |
| Drift | npx agentquilt check | exit 0 |

### Release artifacts

- CHANGELOG.md: <updated for all user-visible changes: yes/no>
- package.json version: <bumped: yes/no>
- Migration notes: <required? included?> (manifest/CLI changes)

### Risk review

- Open critical/high entries in policies/risks/risk-register.yaml touching
  this release: <none | list with disposition>
- Unresolved high-risk PR follow-ups in scope: <none | list>

### Compatibility statement

<what users of the previous version must know; "no breaking changes" only
with evidence>

### Verdict

READY | NOT READY — <blocking items>

Remaining human steps (never performed by an agent): npm version, tag push,
npm publish per release-process.md.
```

## 5. Entry and exit criteria

- PR Summary — entry: validation evidence complete; exit: PR open with all
  required sections filled, CI green, and the Maintainer able to trace every
  claim to an artifact or command result.
- Release-Readiness Summary — entry: `main` green and release scope decided;
  exit: verdict recorded; a NOT READY verdict lists exactly what blocks, and
  no release step happens until a later summary says READY.
