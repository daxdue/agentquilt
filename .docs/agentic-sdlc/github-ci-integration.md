# Agentic SDLC -- GitHub and Deterministic CI Integration (Design)

Date: 2026-07-13
Status: Built (Phase 7 segment 2). Segment 1 was a proposal awaiting
Maintainer approval; the Maintainer approved all seven original decision
points (D1-D7) as recommended, with no amendments, and segment 2 built the
approved design in full, plus resolved one new segment-2 finding (D8, added
below) per its own stop condition.
Companion documents: [claude-code-pipeline.md](claude-code-pipeline.md) and
[codex-pipeline.md](codex-pipeline.md) (the two provider pipelines this phase
exposes to GitHub), [guardrails-design.md](guardrails-design.md) (Phase 6 --
what is already enforced at the tool-call layer, so this phase does not
duplicate it), [agent-portfolio.md](agent-portfolio.md) (the 14-agent
portfolio and 8 skills/commands this phase's templates and docs must
reference by their current names), [risk-and-approval-policy.md](risk-and-approval-policy.md),
[gates.md](../sdlc/gates.md) (G0-G7 quality gates, the normative source for
what "PR Quality Gate" and "Release Gate" mean in this repository),
[EMOJI_POLICY.md](../EMOJI_POLICY.md).

## 1. Purpose and scope

Phase 7 makes GitHub the durable system of record for the agentic SDLC:
issue forms that collect enough information for reliable intake, a PR
template that captures auditable evidence from the agentic loop (Phases 4-6
already produce that evidence as skill/command output; this phase gives it a
fixed place to land in a PR description), and CI that stays deterministic and
model-free while covering everything in the phase doc's required-check list
that is actually meaningful for this codebase. It also documents, for the
first time as its own artifact, how a maintainer hands an issue or PR to
Claude Code and Codex -- closing a gap the phase doc identifies explicitly:
"the provider may use its native GitHub integration or the local `gh` CLI,
but the repository must not include a custom API-invocation layer."

Binding constraints carried over from the master prompt and the phase doc,
not repeated at each section below: development infrastructure only, no
AgentQuilt product feature, provider-native GitHub mechanisms only (issue
forms, PR template, GitHub Actions using existing repository commands), no
model API call anywhere in default/required CI, canonical sources are edited
and generated files are rebuilt via `npx agentquilt build` never hand-edited,
human approval remains required for merge and release, no destructive
operation performed by CI, plain ASCII text throughout (no emojis, smileys,
pictographic symbols, or em/en-dashes -- `--` only).

## 2. Current-state findings (this segment)

Verified 2026-07-13 against the working tree on
`refactor/agentic-sdlc-boundary-cleanup` (clean; `git log --oneline -5` shows
Phase 6's four commits as the most recent history).

### 2.1 Issue templates

`.github/ISSUE_TEMPLATE/` contains exactly two files, both legacy Markdown
issue templates (not GitHub issue forms/YAML):

- `feature_request.md` -- Problem / Proposed Solution / User Story /
  Acceptance Criteria / Affected Area (checkbox list: CLI, Schema, Compiler,
  Linter, Diff, Eval, Governance, Documentation) / Risk Level / Additional
  Context.
- `agent_change.md` -- Agent / Current Behavior / Desired Behavior / Reason /
  Affected Instruction Blocks / Eval Impact / Risk Level / Acceptance
  Criteria.

Neither is a GitHub issue form (`.yml` with a `body:` schema of typed
elements); both are the older free-text Markdown template format (a
`.github/ISSUE_TEMPLATE/config.yml` is also absent, so there is no chooser
page configuration either). Both reference a stale mental model of the
codebase: "Linter" and "Diff" as separate affected-area options describe
features that are `[DEFERRED]` per the root `CLAUDE.md`'s Current Status
section, not built. Neither template asks about generated-output impact,
documentation impact, reproduction evidence, compatibility concerns, or test
expectations -- five of the nine "collect" items the phase doc requires for
every issue type are absent even from these two existing templates. Bug,
refactoring, documentation, provider compatibility, and release task issue
types have no template at all today; a maintainer filing one of those five
gets GitHub's blank-issue fallback.

### 2.2 Pull request template

`.github/pull_request_template.md` exists as a single file (not a
`PULL_REQUEST_TEMPLATE/` directory with multiple templates -- not needed,
since the phase doc asks for one PR template, not several). Current sections:
Summary / Change Type (checkboxes: Documentation, Schema, CLI/Code, Agent
instruction, Eval, Gate/Policy, Security, Release) / Risk Level / Affected
Areas (checkboxes including "Linter" and "Semantic diff", both deferred
features) / Validation (checkboxes) / Agent Impact (changed agents, changed
instruction blocks, expected behavior change, potential side effects) /
Notes for Reviewers.

Comparing against the phase doc's 12-item required list: "linked issue" is
absent entirely (no field or checkbox asks for it). "Task classification" is
present in spirit as "Change Type" but that is a category taxonomy
(Documentation/Schema/CLI/etc.), not the CLS-stage small/standard/high-risk
classification `implementation-planner` and `analyze-issue`
(Phases 4-6) actually produce -- a different concept using an overlapping
word. "Approved plan or rationale" is absent. "Implementation summary" is
absent as a named field (only "Notes for Reviewers", which is not the same
thing). "Design decisions" is absent. "Tests executed" is a single
unelaborated checkbox ("Tests added or updated"), not a place to list which
commands ran and their outcomes. "Generated-output changes" is absent as its
own field (implied only by "Generated files updated if applicable", a
different question -- did they change, not are they reconciled and why).
"Fixture or snapshot explanation" is entirely absent. "Compatibility impact"
is absent as a named field ("Backward compatibility considered" is a
checkbox, not a place to state the impact). "Documentation impact" exists
only as a checkbox. "Review findings and resolution" is absent. "Limitations"
is absent. "Follow-up work" is absent. "Agent Impact" (changed agents,
changed instruction blocks) is a Phase-3-era field that assumed direct manual
edits to `.claude/agents/*.md`; under Phases 4-6's model, agent definition
changes go through `.agentquilt/agents/<name>/` fragments and are rebuilt,
and skill/command changes (the actual agentic-loop surface used day to day)
go through `.claude/skills/`, `.claude/commands/`, `.agents/skills/` --
none of which "Agent Impact" as currently worded asks about.

Net: of the 12 required PR-template items, 2 exist as a differently-scoped
field (Change Type, Documentation impact-as-checkbox), 1 exists as an
unelaborated checkbox (Validation/Tests), and 9 are absent. This is
substantial rework, not a light edit -- consistent with the phase doc calling
this out as "Create or improve," not "verify."

### 2.3 CI workflows

Four workflows exist under `.github/workflows/`:

- **`test.yml`** (`on: pull_request`, `push: branches: [main]`) -- the
  closest thing to a general CI workflow. Steps: checkout, setup-node@20,
  `npm ci` (in `packages/agentquilt-cli`), `npx tsc --project
  tsconfig.test.json` (typecheck), `npm test -- --run` (unit tests via
  vitest), `npm run coverage`, `npm run build`, drift check
  (`node packages/agentquilt-cli/dist/index.js check`). No `lint` step
  (`npm run lint` exists in `package.json` and is unused by any workflow). No
  `format`/`prettier --check` step (`npm run format` exists and only writes,
  never checks). No package-validation step (for example `npm pack
  --dry-run` or `npm publish --dry-run` to catch a broken `files`/`bin`
  manifest before a real publish). No secret-scanning step. No
  dependency-check step (no `npm audit`, no Dependabot config file found
  under `.github/`).
- **`intake.yml`** (`on: issues: types: [opened]`) -- posts a comment
  checking for "problem", "owner", "risk" substrings in a new issue body and
  a second comment inviting the maintainer to open the issue in Claude Code
  and select "the **product-discovery agent**." `product-discovery` is not a
  name in the current 14-agent Phase-3 portfolio (`.claude/agents/*.md`) or
  either Phase 4/5 skill set -- this is a stale reference from before the
  portfolio rationalization the root `CLAUDE.md` describes ("rationalized
  from an earlier 46"). The workflow performs no build/test/check step at
  all; it is a comment-posting bot keyed on `issues`, not a required status
  check on `pull_request`.
- **`pr-review.yml`** (`on: pull_request: types: [opened, synchronize]`) --
  duplicates `test.yml`'s checkout/typecheck/test/coverage/build/drift steps
  almost verbatim (same commands, different step names), then posts a
  comment recommending Claude Code agents named **code-review**,
  **eval-designer** (correct, current), and **security-review** (correct,
  current) -- so this workflow is two-thirds stale (`code-review` is not a
  current agent name; `architecture-reviewer` is the actual REV-stage owner
  per `agent-portfolio.md`) and one-third current. This workflow and
  `test.yml` run the identical deterministic check sequence on the identical
  `pull_request` trigger -- confirmed by diffing their step lists -- meaning
  every PR runs typecheck/test/coverage/build/drift twice today, a real,
  fixable duplication, not a design choice.
- **`release.yml`** (`on: workflow_dispatch`, manual with a `release_type`
  choice input) -- runs tests/coverage/build/drift, then two placeholder
  `echo`-only steps ("Verify risk register": always prints "OK: No blocking
  risks found" regardless of `policies/risks/risk-register.yaml`'s actual
  content -- confirmed by reading the step, it does not parse the YAML file
  at all; "Release readiness check": prints a static report), then posts a
  comment to **issue number 1** (a hardcoded issue number, not the triggering
  context -- confirmed by reading `issue_number: 1` literally in the script)
  recommending Claude Code agents named **release-manager**, **changelog**,
  **versioning**, **migration-guide** -- none of which are current agent
  names (the current, correct role is `release-reviewer`, per
  `agent-portfolio.md` 6.13 and this repo's own `release-readiness` command/
  skill from Phase 4/5). The final step's body also includes literal
  instructions to run `npm version <type>`, `git push origin main --tags`,
  and `npm publish` -- naming the exact three absolute-rule commands Phase 4
  denies via `permissions.deny` and Phase 6's Codex D1 hook denies as well,
  inside a GitHub Actions comment body, not inside an agent's own
  instructions. This is not itself a violation (workflows are not bound by
  `.claude/settings.json`), but it is stale content pointing at agent names
  that no longer exist and worth reconciling with `release-readiness.md`
  (Phase 4 command) and `.agents/skills/release-readiness/` (Phase 5 skill),
  which already assemble this same information correctly.

### 2.4 Repository-hosted GitHub-native features not yet configured

Checked directly via the GitHub API against this repository (`daxdue/agentquilt`,
public):

- **Vulnerability alerts (Dependabot alerts) are disabled** --
  `gh api repos/daxdue/agentquilt/vulnerability-alerts` returned 404 "Vulnerability
  alerts are disabled." No `.github/dependabot.yml` file exists either, so
  neither the alerting feature nor a Dependabot version-update configuration
  is active.
- **No branch protection exists on `main`** -- `gh api
  repos/daxdue/agentquilt/branches/main/protection` returned 404 "Branch not
  protected." No required status checks are configured at the GitHub level
  today; the four workflows above run and report their pass/fail status, but
  nothing currently requires a green check before a PR can merge.
- **Secret scanning / push protection status could not be queried directly**
  via the `gh api` calls available in this non-interactive session (the
  relevant endpoint is under the repository's security settings and was not
  probed further to avoid an unnecessary API call against a live repository
  setting from an unattended investigation step); GitHub enables secret
  scanning alerts by default for all public repositories (confirmed
  from GitHub's own documented default-enablement policy for public repos,
  not from a direct query against this specific repository's dashboard this
  segment could execute) -- treated here as "very likely already on by
  GitHub's public-repo default," not as an unverified assumption stated as
  fact, and flagged as a Maintainer-confirmable item rather than something
  this design silently assumes either way (see D4).

### 2.5 The "hand an issue/PR to Claude Code or Codex" documentation gap

No file under `.docs/agentic-sdlc/` currently documents the mechanical
handoff step "maintainer has a GitHub issue or PR number, wants to start a
Claude Code or Codex session against it." Phase 4's `claude-code-pipeline.md`
and Phase 5's `codex-pipeline.md` both document what happens once a session
is open and a skill/command is invoked, but neither states how the
maintainer gets the issue/PR content into that session in the first place.
`gh` CLI (`gh version 2.92.0`, confirmed installed this segment) is already
the tool this repository's own workflows use for GitHub API access
(`actions/github-script@v7` inside CI; the `mcp__plugin_github_github__*`
tool surface available in an interactive Claude Code session is the same
category of mechanism, GitHub's own official integration, not a custom
API-invocation layer this repository would need to build or maintain). This
matches Phase 4/5's own precedent exactly: "provider-native mechanisms only,
existing repository commands over any new construct."

## 3. Design: issue intake

### 3.1 Six issue types -- one GitHub issue form (YAML) per type

Replace `.github/ISSUE_TEMPLATE/*.md` (2 files, incomplete) with 6 GitHub
issue forms (`.github/ISSUE_TEMPLATE/*.yml`), one per phase-doc-named type:
`bug.yml`, `feature.yml`, `refactoring.yml`, `documentation.yml`,
`provider-compatibility.yml`, `release-task.yml`. Each form collects the
phase doc's nine required items via typed form elements (`dropdown`,
`textarea`, `checkboxes`) rather than free-text headers, which is a strictly
stronger intake mechanism than the current two Markdown templates: a
`textarea` with `validations: required: true` cannot be submitted empty,
whereas a Markdown template's `## Problem` header can be left under an empty
paragraph today with no submission-time enforcement at all. A shared
`config.yml` sets `blank_issues_enabled: false` (require a type) and links
`CONTRIBUTING.md` plus the GitHub Discussions equivalent if one exists (it
does not currently; omit that link rather than invent a feature).

**Nine required collection items, mapped to form fields common to all six
types** (each type's `problem statement` / `expected behavior` textarea is
retitled per type -- for example `bug.yml` uses "Current behavior" /
"Expected behavior"; `feature.yml` uses "Problem" / "Proposed behavior" --
but the underlying nine-item shape is identical across all six so a
maintainer or agent parsing any of the six knows exactly where to look):

1. Problem statement -- `textarea`, required.
2. Expected behavior -- `textarea`, required.
3. Acceptance criteria -- `textarea` with a checklist-formatted placeholder,
   required (an empty or single-line submission is visibly deficient at
   review time even though a form element cannot enforce "at least 2 checked
   items" itself -- GitHub issue forms have no such validator; this is
   `analyze-issue`'s own job at CLS/INV, per its ambiguity-detection
   delegation, not something the form can mechanically block. Named as a
   limitation, not silently assumed solved by the form).
4. Reproduction evidence -- `textarea`, required only on `bug.yml`
   (repro steps, minimal example, logs); optional free-text on the other
   five types where "reproduction" does not apply the same way (a
   `feature.yml` has no bug to reproduce; asks for "current gap" instead
   under the same field position for template-shape consistency).
5. Risk indicators -- `dropdown` (Low / Medium / High / Critical, matching
   the existing two templates' own Risk Level checkbox convention, converted
   to a single-select dropdown since a risk level is exclusive by
   definition, not a multi-check list as the current templates render it).
6. Compatibility concerns -- `textarea`, optional (not every issue type has
   one; asking a required question with "N/A" as the only valid answer most
   of the time degrades signal, matching this design's general preference
   for required-only-where-truly-required, discussed further in D2).
7. Generated-output impact -- `dropdown` (None / AGENTS.md and CLAUDE.md /
   Compiled agent definitions / agentquilt.lock / Not sure), required.
   This is a new field neither existing template has; it maps directly onto
   the "Generated Files Policy" section of the root `CLAUDE.md` and gives
   `documentation-reviewer`/`architecture-reviewer` an immediate signal for
   whether a rebuild is expected as part of the eventual PR.
8. Documentation impact -- `dropdown` (None / README / CLAUDE.md-AGENTS.md
   fragments / .docs architecture or ADR / .docs sdlc-stlc / Not sure),
   required.
9. Test expectations -- `textarea` (what test coverage is expected: new
   unit tests, golden-fixture update, eval update, none), required.

Plus, retained from the current templates because they are still correct and
useful and the phase doc's "collect" list does not ask to remove them: an
`affected area` dropdown/checkboxes (refreshed to the current architecture --
see D1 for the exact list, since "Linter" and "Semantic diff" as options are
stale per `[DEFERRED]` in the root `CLAUDE.md`), and each type's own
type-specific fields (`agent_change`'s "Which agent/skill is affected" and
"Affected instruction blocks," `release-task`'s target version and release
type).

### 3.2 Alternative considered: fewer files via a `type:` dropdown

A single `intake.yml` with a `type:` dropdown (Bug / Feature / Refactoring /
Documentation / Provider compatibility / Release task) as its first field,
followed by the same nine common fields, would cut six files to one and
avoid divergence between them over time (a common risk with N near-identical
templates: fields drift out of sync as only some get updated). The tradeoff
against the phase doc's own explicit six-type list: GitHub issue forms
cannot conditionally show/hide fields based on another field's value (no
`if`/`when` mechanism exists in the schema) -- a single form would either
show all type-specific fields to every submitter regardless of type (a bug
report would still show a "target release version" field it has no use for)
or drop type-specific fields entirely and rely on the nine common fields
alone, losing `bug.yml`'s reproduction-evidence emphasis and
`release-task.yml`'s version/scope fields as distinct, differently-required
elements. This is the real tradeoff named in the phase doc's own investigate
list (item 4); see D1.

## 4. Design: pull request template

Single `.github/pull_request_template.md`, rewritten (not appended to) to
carry the phase doc's 12 required items plus the 2-3 currently-correct items
worth retaining, ordered to mirror the SDLC stage sequence a `develop-issue`/
`standard-development` run actually produces its artifacts in (CLS -> INV ->
PLN -> IMP -> VER -> REV -> COR -> RGR -> DOC -> PRP), so filling out the
template in order matches producing the evidence in order:

1. **Linked issue** -- `Closes #___` / `Relates to #___` (GitHub's own
   issue-linking syntax, not a custom field -- this is the one item on the
   list that has a first-class native mechanism already, just missing from
   the current template).
2. **Task classification** -- the CLS-stage output (small / standard /
   high-risk) from `analyze-issue`/`implementation-planner`, distinct from
   and in addition to the existing "Change Type" taxonomy (kept, since both
   questions are useful and answer different things -- "what kind of change"
   vs. "how much process rigor did it need").
3. **Approved plan or rationale** -- link to the `plan-change` Implementation
   Plan artifact (if a standard/high-risk task went through the approval
   gate) or a one-line rationale for why a small task skipped formal
   planning, per the master prompt's own "low-risk bounded tasks... do not
   require repeated approval" carve-out.
4. **Implementation summary** -- prose, what was actually built (distinct
   from "Summary," which stays as the existing free-form top-level
   description).
5. **Design decisions** -- notable choices made during implementation and
   why (see D3 for how prescriptive this section should be).
6. **Tests executed** -- a structured list (command + result), not a
   checkbox, mirroring `checks_run` in the phase-report frontmatter schema
   this same execution model already uses for agentic-SDLC-phase work --
   reusing a format convention already proven in this repository rather than
   inventing a new one.
7. **Generated-output changes** -- explicit Yes/No plus, if yes, which
   targets and confirmation that `npx agentquilt build` (never a hand-edit)
   produced them.
8. **Fixture or snapshot explanation** -- explicit Yes/No plus, if yes, the
   root-cause explanation `regression-reviewer`'s own BLOCKER-on-unexplained-
   fixture-diff contract already requires at review time (this field gives
   that explanation a place to live in the PR itself, not just in a review
   comment thread).
9. **Compatibility impact** -- prose (breaking / non-breaking, and why).
10. **Documentation impact** -- prose (what was updated, or why nothing
    needed to be).
11. **Review findings and resolution** -- table or list: finding, severity,
    resolution (matches `review-tree`'s own Review Findings artifact shape
    from Phase 4/5/6's skill design).
12. **Limitations** -- prose, known gaps.
13. **Follow-up work** -- prose, deferred items.

Retained from the current template: **Risk Level** (single-select, matching
the issue forms' own dropdown for consistency), **Validation** checkboxes
(kept as a lightweight pre-flight checklist distinct from the structured
"Tests executed" list above -- a checklist item like "Backward compatibility
considered" is a yes/no prompt to think about something, not a place to
record a command's output). **Affected Areas** checkboxes (refreshed list,
same staleness fix as the issue forms -- see D1). Dropped: "Agent Impact"
(changed agents / changed instruction blocks / expected behavior change /
potential side effects) as its own section, folded into "Generated-output
changes" (item 7, if `.agentquilt/agents/` fragments changed) and "Design
decisions" (item 5, if the change is agent-behavior-relevant) rather than
kept as a fifth, redundant place asking an overlapping question. "Notes for
Reviewers" is dropped as a separate section since "Limitations" and
"Follow-up work" (items 12-13) now cover the same intent more specifically.

## 5. Design: CI

### 5.1 Required-check category disposition

Working through the phase doc's exact list against what this codebase
actually has, distinguishing "missing and needed" from "not applicable, with
reason":

| Category | Status today | Disposition |
| -------- | ------------- | ----------- |
| Installation integrity | `npm ci` runs in both `test.yml` and `pr-review.yml`; `npm ci` itself fails on a `package-lock.json`/`package.json` mismatch, which is the standard meaning of this check. | Already covered. No change needed beyond deduplication (section 5.2). |
| Formatting | `npm run format` exists (`prettier --write`) but is never invoked in CI, and `--write` mutates rather than checks. | Missing and needed. Add a `prettier --check` invocation (see D2 for whether this is in-phase or deferred, since it is a genuinely new CI step, not a consolidation of an existing one). |
| Lint | `npm run lint` exists (`eslint src --ext .ts`) and is never invoked in CI. | Missing and needed, same category as formatting. |
| Type checking | `npx tsc --project tsconfig.test.json` runs in both `test.yml` and `pr-review.yml`. | Already covered (duplicated; see 5.2). |
| Unit tests | `npm test -- --run` (vitest) runs in both. | Already covered (duplicated). |
| Integration tests | No separate integration-test suite or directory exists under `packages/agentquilt-cli/tests/` beyond the golden-fixture tests (themselves closer to end-to-end/golden than classic "integration"). | Not applicable as a distinct category for this codebase today -- the CLI's own `agentquilt check`/`agentquilt build` invocations against fixture repos, already exercised by the unit test suite (confirmed: `vitest run` includes tests that shell out to or directly call the compiler against fixture directories), functionally serve the same purpose a separate integration suite would. Not a gap to fill with a new CI step; noting the "unit vs. integration" line is already blurred by design in this codebase's own test strategy (`.docs/stlc/test-strategy.md` is the normative source, not re-litigated here). |
| Coverage | `npm run coverage` runs in `test.yml` and `pr-review.yml`, but neither workflow enforces a threshold -- `vitest run --coverage` exits 0 regardless of the coverage percentage unless a threshold is configured in `vitest.config`. | Partially covered (the numbers are produced and visible in CI logs) but not enforced as a gate. Whether to add an enforced threshold is a genuinely new policy decision (what percentage; whether per-file or aggregate), not a mechanical fix -- flagged as a candidate but not designed further here since it requires a number the Maintainer should pick, not one this design should assume (see D5). |
| Build | `npm run build` runs in both. | Already covered (duplicated). |
| AgentQuilt drift checks | `node packages/agentquilt-cli/dist/index.js check` runs in both, after build. | Already covered (duplicated). |
| Fixture and golden tests | Golden fixtures live under `packages/agentquilt-cli/tests/fixtures/golden/` and are exercised by `npm test` (confirmed: no separate `npm run test:golden` script exists; golden tests are vitest test files like any other, already included in the single `npm test` run). | Already covered as part of the existing unit-test run, not a category needing its own CI step -- naming it as a visible, separate CI step (even if it invokes the same underlying `npm test`) has documentation value (a maintainer scanning workflow step names sees "golden fixtures ran" explicitly) but is not a new check, just a possible relabeling. Not designed further as a functional gap. |
| Package validation | No `npm pack --dry-run` or equivalent step exists in any workflow; `release.yml` builds and drift-checks but never validates the actual publishable tarball contents (`files: ["dist"]` in `package.json`) before the manual `npm publish` step a human runs afterward. | Missing and needed for `release.yml` specifically (not `test.yml`/`pr-review.yml`, which are not about to publish anything) -- a `npm pack --dry-run` step would catch a broken `files`/`bin`/`main` manifest before a human ever runs the real `npm publish`, which is exactly the kind of deterministic, no-model-call, existing-tool check this phase should add. |
| Secret scanning | Public repository; GitHub's own secret scanning + push protection is enabled by default for all public repositories and requires no repository-side configuration file to activate (a `gitleaks`/`trufflehog`-style CI step would be an additional, redundant scanner, not a replacement for GitHub's own, and would be the first new third-party Action dependency this repository's CI would take on). | Very likely already covered by an existing GitHub-native feature requiring no new CI step -- but this segment could not directly confirm the toggle state for this specific repository via the read-only `gh api` calls available (section 2.4). Flagged as a Maintainer-confirmable item, not silently assumed either way (D4). |
| Dependency checks | `.github/dependabot.yml` does not exist; `vulnerability-alerts` confirmed disabled via direct API query (section 2.4); no `npm audit` step exists in any workflow. | Missing and needed on two independent axes: (a) a `.github/dependabot.yml` (or enabling the Dependabot alerts toggle, which is a repository-settings action a workflow file cannot perform) to get version-update PRs and vulnerability alerts, which is the standard, native GitHub mechanism for this exact category, not a CI step at all; (b) optionally, an `npm audit --audit-level=high` (or similar) CI step as a second, PR-time layer. Both are genuinely new; D5. |

Summary: of 12 named categories, 5 are already covered today (installation
integrity, type checking, unit tests, build, drift checks -- all duplicated
across two workflows, a cleanup item, not a coverage gap), 2 are not
meaningfully applicable as separate categories for this codebase today
(integration tests, fixture/golden tests -- both already subsumed by the
existing unit-test run, with reasons stated rather than silently skipped), 1
is produced but not enforced (coverage threshold), 1 is very likely already
covered by a GitHub-native default requiring confirmation rather than a new
step (secret scanning), and 3 are genuinely missing with a concrete addition
proposed (formatting, lint, package validation) or a two-part addition
proposed (dependency checks: Dependabot config plus an optional audit step).

### 5.2 Workflow consolidation

`test.yml` and `pr-review.yml` run an identical deterministic check sequence
on the identical `pull_request` trigger today -- confirmed by direct
comparison in section 2.3, not asserted. This phase's design consolidates
them into one workflow (keeping `test.yml`'s name, since it is the plainer
and more accurate name for what the file does; `pr-review.yml`'s
comment-posting step, once its stale agent names are corrected, becomes an
additional step in the consolidated file rather than a second full run of
the same checks) with the new formatting/lint/coverage-threshold-visibility
steps added and no duplication. `intake.yml`'s stale
`product-discovery`-agent comment is corrected to reference the current
mechanism (this phase's own section 6 documentation, plus `analyze-issue`
by name) as part of the same pass, since leaving a broken agent-name
reference in a comment a maintainer will actually read defeats the purpose
of documenting the real mechanism elsewhere. `release.yml`'s stale agent
names (`release-manager`, `changelog`, `versioning`, `migration-guide`) are
corrected to `release-reviewer` and the existing `release-readiness`
command/skill, its hardcoded `issue_number: 1` is corrected to post against
the triggering context (or dropped if no natural issue/PR context exists for
a `workflow_dispatch`-triggered run, which is the actual case here -- a
`workflow_dispatch` run has no associated issue or PR at all, so
`issue_number: 1` is not just wrong, it is targeting an arbitrary,
unrelated issue every single time this workflow has ever run; corrected to
either drop the comment-posting step entirely in favor of the job summary
GitHub Actions already renders, or post to a fixed, purpose-made tracking
issue if the Maintainer wants one -- D6), and its "Verify risk register"
step's always-`OK` placeholder is either wired to a real check or its
misleading always-pass behavior is removed (a step that always prints "OK"
regardless of the file it claims to check is worse than no step, since it
creates false confidence -- D6).

No new job/step is proposed for `pull_request`-triggered CI beyond
formatting and lint (both trivial, already-scripted, zero new dependencies).
Coverage-threshold enforcement and the Dependabot/audit additions are
flagged as decision points (D5) rather than built into this design outright,
since both require a Maintainer-chosen parameter (a percentage; an audit
severity level) this design should not assume.

### 5.3 What is explicitly not proposed

- No workflow triggers on `issue_comment` or `pull_request_review` to invoke
  any agent automatically -- that would be the "custom API-invocation layer"
  / "autonomous agent workflow" the master prompt and phase doc explicitly
  forbid.
- No Claude Code Action, Codex Action, or any GitHub Action that calls a
  model API is wired into any required check in this phase. Section 6.3
  evaluates the existence of such actions as a documented option for later,
  explicitly not adopted now.
- No branch-protection or required-status-check configuration change is
  proposed as part of this phase's deliverables -- section 6.4 explains why
  this is named as its own gate-flagged decision rather than folded into the
  workflow-file changes.

## 6. Design: documenting the maintainer-to-provider handoff

### 6.1 Placement

A new file, `.docs/agentic-sdlc/github-provider-handoff.md`, documents the
mechanical steps for "I have a GitHub issue or PR number; how do I start a
Claude Code or Codex session against it." This is prose documentation, not a
skill/command/workflow -- consistent with the phase doc's own framing
("Document how maintainers provide an issue or PR...") and with this being
the one Phase 7 deliverable that is purely explanatory, no file under
`.github/` involved.

### 6.2 Content shape (drafted here; not yet written as its own file this
segment, per the stop condition -- built in segment 2 alongside the
`.github/` files)

- **Claude Code path**: the `gh` CLI (already installed, confirmed this
  segment) or Claude Code's own native GitHub integration (the
  `mcp__plugin_github_github__*` tool surface already available in this
  session, GitHub's own official MCP server, not a custom layer) to read
  issue/PR content into context, then invoke `analyze-issue` (for an issue)
  or `review-tree` (for reviewing an existing PR's diff) by name, matching
  Phase 4's `develop-issue` entry point.
- **Codex path**: the local `gh` CLI (Codex has no equivalent bundled
  GitHub MCP integration confirmed by this repository's `.codex/` setup in
  Phase 5 -- `gh issue view <n>`/`gh pr diff <n>` piped or referenced in the
  session prompt) to bring the same content into a Codex session, then
  invoke `standard-development` (the Codex-side equivalent entry skill from
  Phase 5) by name.
- **Explicit non-mechanism statement**: neither path involves a webhook, a
  GitHub App, a bot account, or any code in this repository that calls
  `api.github.com` on an agent's behalf outside of an interactive CLI
  session a human started -- restating the phase doc's "must not include a
  custom API-invocation layer" constraint in the one place a maintainer
  reading this specific how-to document would look for it.
- **What CI does NOT do**: explicit statement that none of the workflows in
  section 5 invoke either provider, so this document's handoff steps are the
  *only* path from a GitHub issue/PR to a Claude Code or Codex session --
  there is no automatic trigger a maintainer could rely on instead.

### 6.3 Provider-native GitHub Actions -- evaluated, not adopted

Anthropic publishes a Claude Code GitHub Action (documented at
`code.claude.com`) that can run inside a workflow, triggered by an
`@claude` mention or a label, and post results as a PR comment or commit
suggestion. This exists and is provider-native (not a custom API layer this
repository would build) -- but it necessarily makes a live model API call
from within GitHub Actions, which is exactly what the phase doc's "Default
CI must not invoke Claude, Codex, or any model API" and "must not be made a
required quality gate during this phase" both explicitly rule out for this
phase. This design's disposition: name it here as a real, documented,
available option (satisfying the phase doc's "may be evaluated later"
allowance) with three concrete non-adoption reasons -- (1) it would be the
first workflow step requiring a repository secret (an API key), a new
category of operational surface this repository has none of today; (2) it
would blur the "agents run in provider CLIs, invoked manually by a
maintainer, CI stays deterministic" model this repository has deliberately
maintained since the Phase 3.1-3.3 retraction (root `CLAUDE.md`'s own
`[RETRACTED]` section); (3) even as a non-required, informational-only check
it would need its own careful cost/rate-limit/trust boundary design that
this phase's scope (deterministic CI plus documentation) does not cover --
not evaluated further here, left as a possible future phase if the
Maintainer ever wants it, exactly as the phase doc anticipates.

### 6.4 Branch protection / required status checks -- named, not configured

Section 2.4 confirmed `main` has no branch protection today, meaning none of
the existing (or this phase's new) CI checks are actually required before a
merge can happen at the GitHub level -- a maintainer could merge a PR with a
red `test.yml` run today, nothing stops it. Making a check "required"
is a repository Settings change (or a `gh api` call against the branch
protection endpoint), not a `.github/workflows/*.yml` file change -- and per
the execution-model.md section 7 gate table and this task's own explicit
instruction, "flag anything that touches required-status-check
configuration or branch protection as a gate candidate since that is a
shared/repo-wide setting change." This design deliberately does NOT
configure branch protection as part of its build segment; it names the
current checks that would be reasonable candidates for "required" status
(the consolidated `test.yml` job) as a recommendation for the Maintainer to
apply directly (via GitHub Settings or `gh api`), separately from and after
this phase's file changes land -- see D7.

## 7. Explicit non-goals

- No workflow, issue form, or PR template that invokes Claude, Codex, or any
  model API. Every check this design proposes runs an existing repository
  command (`npm ci`, `npm run lint`, `npx prettier --check`, `npx tsc`,
  `npm test`, `npm run coverage`, `npm run build`, `npx agentquilt check`,
  `npm pack --dry-run`, `npm audit`) or is native GitHub configuration
  (issue forms, Dependabot config).
- No custom API-invocation layer, webhook receiver, GitHub App, or bot
  account. Section 6 documents `gh` CLI and each provider's own native
  GitHub integration as the entire mechanism.
- No auto-merge, no auto-release, no auto-tag, no auto-publish anywhere in
  any workflow this design proposes or modifies. `release.yml` remains
  `workflow_dispatch`-triggered, human-initiated, and ends at a readiness
  report, exactly as it does today -- this design corrects its stale content
  (section 5.2) without changing its manual-trigger, human-decides shape.
  reasserted here because it is that important. no autonomous agent
  workflow is proposed or already exists; nothing in this design changes
  that.
- No branch-protection or required-status-check configuration performed by
  this design's build segment (section 6.4) -- named as a Maintainer
  follow-up action, not executed here, since it is a repository-wide setting
  change outside a `.github/` file's own scope.
- No coverage-threshold percentage, audit-severity level, or
  Dependabot-schedule cadence chosen unilaterally by this design -- each is
  flagged as its own decision point (D5) rather than assumed.
- No third-party GitHub Action beyond the `actions/checkout`,
  `actions/setup-node`, and `actions/github-script` this repository's
  workflows already use, unless a specific Maintainer decision (D5's
  dependency-check sub-question) adds one.

## 8. Decision points for the Maintainer (gate)

- **D1 -- Six separate issue-form files vs. one form with a `type:`
  dropdown (section 3.1, 3.2).** Recommendation: six separate files
  (`bug.yml`, `feature.yml`, `refactoring.yml`, `documentation.yml`,
  `provider-compatibility.yml`, `release-task.yml`), matching the phase
  doc's own explicit six-type list verbatim and because GitHub issue forms
  cannot conditionally show/hide fields by type, so a single form would
  either show every type's fields to every submitter (visually cluttered,
  degrades the "enough information for reliable intake" acceptance
  criterion by burying the relevant fields in irrelevant ones) or drop
  type-specific fields entirely (losing real signal, for example
  `bug.yml`'s reproduction-evidence emphasis). Alternative: one file with a
  `type:` dropdown plus only the nine common fields, accepting the loss of
  type-specific fields, for a lower file-count and zero risk of the six
  files drifting out of sync with each other over time as edits happen to
  only some of them -- a real, not unreasonable, alternative; not
  recommended only because the phase doc's own wording ("Create or improve
  issue forms for: bug, feature, refactoring...") reads as six intentionally
  distinct artifacts, not six values of one field.
- **D2 -- Required vs. optional for the nine common issue-form fields, and
  for "compatibility concerns" specifically (section 3.1 item 6).**
  Recommendation: require problem statement, expected behavior, acceptance
  criteria, risk indicators, generated-output impact, documentation impact,
  and test expectations (7 of 9); leave reproduction evidence required only
  on `bug.yml` (optional elsewhere) and compatibility concerns optional on
  all six -- because "N/A" as the only valid answer to a required field most
  of the time is worse than an optional field a submitter fills in when it
  actually applies (a required-everywhere field trains submitters to type
  filler text to get past validation, which degrades signal quality more
  than an honest blank). Alternative: require all nine on all six types
  uniformly, for maximum mechanical enforcement and the simplest rule to
  explain -- reasonable, not recommended only because of the "N/A" filler-
  text risk just described, which is a real, observed failure mode of
  over-required web forms generally, not a hypothetical.
- **D3 -- How prescriptive the PR template's "Design decisions" and "Review
  findings and resolution" sections should be (section 4 items 5, 11).**
  Recommendation: a short instructional placeholder line each ("Notable
  choices made during implementation and why" / "Finding | Severity |
  Resolution, one row per finding from the review stage") rather than a
  rigid required sub-schema, because both sections' actual content comes
  from `review-tree`'s Review Findings artifact and `implement-task`'s own
  Return Handoff (Phase 4/5/6 skill outputs) which already have their own
  fuller, more structured shape upstream -- the PR template's job is to give
  that already-produced content a place to land, not to re-specify its
  format a second time in a different file that could drift out of sync
  with the skill contracts. Alternative: mirror the full table/field
  structure from `review-contract.md`'s Review Findings schema directly
  inside the PR template, byte-for-byte -- more rigorous, not recommended as
  the default because it duplicates a schema that already lives in one
  place (`review-contract.md`) into a second place (the PR template) that a
  future edit to the contract would need to remember to update too; the
  placeholder-plus-reference approach avoids that duplication.
- **D4 -- Secret scanning: confirm-and-document vs. add a redundant CI
  scanner step (section 5.1 secret-scanning row).** Recommendation:
  document that GitHub's native secret scanning and push protection are
  enabled by default for public repositories (which this repository is,
  confirmed section 2.4) and ask the Maintainer to confirm the toggle
  directly in the repository's Settings > Code security page (a check this
  executor could not perform via the read-only `gh api` calls available),
  rather than adding a `gitleaks`/`trufflehog`-style Action as a second
  scanner -- a redundant scanner adds a new third-party Action dependency
  and a second place secret-pattern rules need to be maintained, for
  marginal benefit over GitHub's own native, already-likely-active
  mechanism, and would also somewhat duplicate `security-review`'s own
  REV-time pattern-matching duty from Phase 6's guardrail design.
  Alternative: add the CI-level scanner regardless, treating "confirm a
  GitHub setting" as too weak a guarantee for a "secret scanning" checkbox
  the phase doc explicitly lists -- reasonable if the Maintainer wants a
  belt-and-suspenders posture, not recommended as the default given the
  redundancy-with-Phase-6 and new-dependency costs just described.
- **D5 -- Coverage threshold, npm audit severity level, and Dependabot
  update cadence (section 5.1 coverage and dependency-checks rows).**
  Recommendation: add `.github/dependabot.yml` with a weekly npm
  version-update schedule for `packages/agentquilt-cli` (the standard,
  lowest-maintenance-burden default) and enable the Dependabot alerts
  toggle (a Settings action, named alongside D7 as a Maintainer follow-up,
  not a `.github/` file); add `npm audit --audit-level=high` as a
  non-blocking (`continue-on-error: true`, informational only) CI step
  rather than a hard-failing gate this phase, since a hard-failing audit
  step can break CI on a transitive dependency's newly disclosed
  vulnerability with no code change on this repository's part, which is
  exactly the kind of surprise-red-CI-with-no-local-cause this repository's
  existing deterministic-check philosophy tries to avoid; defer an enforced
  coverage-threshold percentage entirely (visible-but-unenforced coverage
  output continues as today) since choosing a specific number is a policy
  call with no clearly-correct default the way "weekly" and "high-severity-
  only, non-blocking" are for the other two. Alternative: skip Dependabot/
  audit entirely this phase, treating dependency risk as already covered by
  `supply-chain-risk`'s existing REV-time review duty (Phase 3/6) -- a
  legitimate minimalist position, not recommended only because Dependabot
  alerts specifically catch *already-merged* dependencies developing a
  vulnerability *after* merge, a case `supply-chain-risk`'s point-in-time
  REV review structurally cannot catch since it only runs once, at review
  time, for a specific PR.
- **D6 -- `release.yml` cleanup scope (section 5.2).** Recommendation:
  correct the stale agent names (`release-manager`/`changelog`/`versioning`/
  `migration-guide` to `release-reviewer` and the existing
  `release-readiness` command/skill), drop the hardcoded
  `issue_number: 1` comment-posting step entirely in favor of the
  step's own `echo` output already visible in the GitHub Actions job
  summary/log (a `workflow_dispatch` run has no natural issue/PR to comment
  on, so removing the misdirected comment is more honest than redirecting it
  somewhere equally arbitrary), and either wire "Verify risk register" to a
  real, minimal check (for example: fail if
  `policies/risks/risk-register.yaml` contains an item with `severity:
  critical` or `severity: high` and `status: open`, a small deterministic
  YAML-field check, not a judgment call) or remove the step's misleading
  always-`OK` text in favor of an honest "not automated; Maintainer reviews
  the risk register directly" comment. Alternative: leave `release.yml`
  entirely untouched this phase, treating it as out of the phase doc's
  explicit scope (issue intake, PR template, CI, agent-handoff docs) -- not
  recommended, since the phase doc's CI list includes checks `release.yml`
  specifically is the home for (package validation, dependency checks
  before a release) and leaving stale, actively misleading agent names and
  a some-of-the-time-wrong hardcoded issue number in a committed workflow
  file that a maintainer will read and trust during an actual release is a
  real cost of doing nothing, not a neutral default.
- **D7 -- Branch protection / required status checks (section 6.4).**
  Recommendation: do not configure branch protection in this phase's build
  segment; instead, name the consolidated `test.yml` job as the
  recommended required check and hand that recommendation to the Maintainer
  as an explicit follow-up action (via GitHub repository Settings or a
  one-time `gh api` call the Maintainer runs themselves, not this
  executor), consistent with this being a shared, repo-wide setting change
  the task instructions explicitly asked to flag as a gate candidate.
  Alternative: have the build segment run the `gh api` call to configure
  branch protection directly, since `gh` is available and authenticated in
  this environment -- not recommended, since execution-model.md section 7
  treats "anything that touches required-status-check configuration or
  branch protection" as gate-worthy specifically because it is a
  repository-wide setting no single phase segment should apply unilaterally
  even if mechanically capable of doing so.

## 9. Segment-2 finding: D8 -- lint and format are not currently enforceable cleanly

Discovered during the build segment, before any workflow YAML referencing
`npm run lint` or `npx prettier --check` was committed, per the build
segment's own explicit instruction to verify each new CI step locally
first.

**Finding:** `npm run lint` (`eslint src --ext .ts`) fails immediately with
"ESLint couldn't find a configuration file" -- no `.eslintrc*` or
`eslint.config*` file exists anywhere in `packages/agentquilt-cli/` or the
repository root. This is not a lint failure on the code; the lint tooling
itself has never been configured, confirmed by a direct filesystem search
finding zero configuration files of either the legacy or flat-config form.
Separately, `npx prettier --check src tests` reports 50 files with
formatting issues (every `.ts` source and test file, plus several fixture
`.md` files) -- formatting has never been enforced or applied as a repo-wide
pass, confirmed by running the command directly against the current
working tree.

**Resolution applied (not a Maintainer decision point requiring a stop,
since the phase-doc-approved D5 audit-step pattern already established the
template): both steps were added to the consolidated `test.yml` as
`continue-on-error: true`, informational-only steps** -- visible in every
PR's check run output, never blocking a merge or failing the workflow,
exactly mirroring D5's own `npm audit --audit-level=high` treatment for the
identical reason (a currently-broken/unconfigured check must not turn every
open PR red on the day this phase's workflow lands). Per the coordinator's
explicit instruction, no unrelated pre-existing formatting violation was
fixed and no ESLint configuration was authored as part of this phase --
both would be a materially larger, differently-scoped change (reformatting
50 files repository-wide; designing and adopting an ESLint rule set) than
"wire an existing script into CI," and neither was requested by the phase
doc.

**This is recorded here as a decision surfaced during the build, not
silently resolved by assumption:** the Maintainer should treat "add ESLint
configuration" and "run a repository-wide Prettier pass" as two candidate
follow-up tasks, each its own small planned change (with its own PR,
diffing 50-plus files for the formatting pass alone) rather than something
this phase's CI-integration build should have absorbed. Until either
follow-up lands, `test.yml`'s format and lint steps remain informational
only -- this is stated explicitly in the PR-quality-gate comment `test.yml`
posts on every PR (see the workflow file itself), so the non-blocking
status is visible to every contributor, not just documented here.
