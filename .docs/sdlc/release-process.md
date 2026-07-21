# Release Process

## Overview

Releases follow the milestone roadmap defined in [roadmap.md](../roadmap.md).
The release unit is the Changesets package tag (`agentquilt@X.Y.Z`). npm
publish is the primary distribution channel.

Versioning, changelog generation, and publishing are automated via
[Changesets](https://github.com/changesets/changesets) and the
`.github/workflows/release.yml` GitHub Actions workflow. Per
[ADR-0004](../architecture/adr/ADR-0004-ai-assistance-authority-model.md)
and [ADR-0013](../architecture/adr/ADR-0013-automated-release-harness.md),
a human always makes the two decisions that matter — *whether* a change is
release-worthy, and *when* to cut the release — everything mechanical after
that runs without a human touching `npm publish` directly.

---

## How it works

### 1. Contributors add a changeset for user-visible changes

Any PR with a user-visible change (bug fix, new feature, CLI behavior
change) should include a changeset:

```bash
npx changeset add
```

This prompts for the affected package (normally just `agentquilt`), the
semver bump type (patch/minor/major — see Versioning Policy below), and a
short summary. It writes a small Markdown file under `.changeset/` that
gets committed alongside the PR's other changes. This is the "whether" —
a human decides a change is release-worthy by adding a changeset at all.

PRs that are purely internal (docs, tests, CI tuning, `.agentquilt/`
fragment refactors that don't change compiled agent behavior) don't need
one.

### 2. Merges to `main` keep a "Version Packages" PR up to date

Every push to `main` runs `.github/workflows/release.yml`. If there are
pending changesets, the workflow opens or updates a bot-owned PR titled
something like `chore: version packages`. That PR:

- bumps `packages/agentquilt-cli/package.json` to the next version implied
  by the accumulated changesets,
- writes the corresponding section into `CHANGELOG.md` (accessible from
  either the repo root or `packages/agentquilt-cli/CHANGELOG.md`, which is
  a symlink to the same file),
- consumes (deletes) the changeset files that fed it.

Nothing publishes at this point. The PR just sits there, accumulating
further changesets as more PRs merge, until a Maintainer is ready to
release.

### 3. Merging the Version Packages PR cuts the release

This is the "when" — a human decides to release by merging that PR. Once
merged, the next run of `release.yml` finds no pending changesets (they
were already consumed) and instead runs the publish path: builds the CLI
and runs `changeset publish`, which publishes with npm provenance, creates
and pushes the resulting `agentquilt@X.Y.Z` package tag, and lets the
pinned Changesets action create the corresponding GitHub Release. There is
no second custom tag or release step.

### 4. Everything else in the gate suite still runs first

Before either the version-PR or the publish path executes, `release.yml`
runs the same deterministic checks that have always gated a release: full
test suite, coverage, CLI build, `agentquilt check` drift check, pipeline
agent drift check, asserted package-content validation, the Node 18
compatibility job, and the
open-high/critical-risk check against `policies/risks/risk-register.yaml`.
A failure in any of these blocks both the version PR and the publish step.

---

## One-time setup (Maintainer only, outside this repo)

- Publishing authenticates via npm's Trusted Publishing (OIDC) flow, not
  a stored token. Configure it from the `agentquilt` package's settings
  page on npmjs.com, naming this repo, the `release.yml` workflow, and
  the `release` job as the trusted source. This is required for the
  publish step and cannot be done by an agent or workflow. No `NPM_TOKEN`
  secret is used or required.

---

## Versioning Policy

- **Patch** (`0.x.Y`): bug fixes with no manifest format or CLI command changes
- **Minor** (`0.X.0`): new features, new commands, new adapter support
- **Major** (`X.0.0`): breaking changes to manifest format, lock format, or CLI behavior (reserved for post-v1.0.0)

During pre-release (`0.x`), minor versions may include breaking changes with ADR documentation.

---

## G6 Release Gate

Before a Version Packages PR is merged, all of the following must be true
(mechanically enforced by `release.yml`'s `checks` job, except where
noted):

- [ ] All tests pass on `main`
- [ ] Coverage produced and reviewed
- [ ] Drift check passes (`agentquilt check` against the repo's own config)
- [ ] `CHANGELOG.md` entry present and accurately categorized (written by
      Changesets from the accumulated changeset summaries — Maintainer
      reviews wording in the Version Packages PR before merging)
- [ ] `package.json` version bumped to the new version (done by Changesets)
- [ ] No open critical or high-severity issues in the risk register
- [ ] Migration notes written if any manifest format or CLI command changed
      (not automated — add these by hand to the relevant changeset's
      summary, or amend the Version Packages PR before merging)
