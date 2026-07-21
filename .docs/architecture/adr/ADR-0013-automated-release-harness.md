# ADR-0013: Automated Release Harness

## Status

Accepted

## Context

Releasing AgentQuilt was, until now, a fully manual process
(`.docs/sdlc/release-process.md`): a Maintainer hand-edited
`CHANGELOG.md`, hand-bumped `packages/agentquilt-cli/package.json`, opened
a release PR, and after merge ran `npm publish` from a laptop.
`.github/workflows/release.yml` only ever printed a readiness report on
manual `workflow_dispatch` — it never performed the release itself, and
said so explicitly in its own output.

Separately, `packages/website` deploys automatically via Vercel's native
Git integration on every push to `main`, but nothing in CI ever built it —
a broken Astro build would only be caught by Vercel's own build step,
after the change had already merged.

The Maintainer asked for this to run automatically, following modern
practice, while keeping the repository's existing governance intact.
ADR-0004 (AI Agents Assist but Do Not Approve or Release) requires that
releasing a package remain a human decision. Any automation here has to
satisfy both goals at once: eliminate the manual mechanical work, without
letting a workflow decide on its own that a release should happen.

## Decision

### Versioning and changelog: Changesets

Adopt [Changesets](https://github.com/changesets/changesets)
(`@changesets/cli`) at the workspace root. Configuration
(`.changeset/config.json`): `baseBranch: "main"`, `access: "public"`,
`ignore: ["agentquilt-website"]` (the website is private and not
published — Changesets never versions or changelogs it), changelog
generation via `@changesets/changelog-github` for PR/commit-linked
entries.

`CHANGELOG.md` stays at the repository root rather than moving under
`packages/agentquilt-cli/`. Changesets expects to read/write
`<packageDir>/CHANGELOG.md`, but roughly a dozen existing references
(`release-process.md`, the `release-reviewer` agent fragment compiled into
`.claude/agents/release-reviewer.md`, the `release-readiness` command,
`completion-contract.md`, several `.docs/agentic-sdlc/evals/` scenario and
fixture docs — including a prompt-injection eval scenario that asserts
editing files beyond a root-level `CHANGELOG.md` is an automatic FAIL)
assume the root location. `packages/agentquilt-cli/CHANGELOG.md` is a
relative symlink to `../../CHANGELOG.md`, so Changesets writes through it
to the same file every existing reference already points at.

`packages/agentquilt-cli/package.json` gains
`"publishConfig": { "access": "public", "provenance": true }` — npm
provenance (build attestation via GitHub Actions OIDC) is current best
practice for packages published from CI.

### Release workflow: human-gated, mechanically automated

`.github/workflows/release.yml` is rewritten to trigger on every push to
`main` (instead of manual `workflow_dispatch`), with three jobs:

1. `checks` — the same deterministic gate suite the old workflow ran by
   hand (tests, coverage, build, drift check, pipeline agent drift check,
   package validation, risk-register check). Must pass before anything
   else runs.
2. `node18` — builds and tests on the minimum supported Node version and is
   a direct dependency of publication.
3. `release` — runs a commit-SHA-pinned Changesets action. If changesets are pending on
   `main`, it opens or updates a bot-owned "Version Packages" PR (bumps
   `package.json`, writes the `CHANGELOG.md` section) and stops — nothing
   publishes. If no changesets are pending (the push *is* that PR having
   just been merged), it runs `npm run release` (`changeset publish`),
   which publishes to npm with provenance. Changesets creates the single
   `agentquilt@X.Y.Z` package tag and corresponding GitHub Release; the
   workflow does not create a second custom release identity.

This preserves ADR-0004's human-approval requirement at both decision
points:

- **Whether** a change is release-worthy: decided by a human adding a
  changeset (`npx changeset add`) to their PR. No changeset, no version
  bump, no CHANGELOG entry — nothing enters the release pipeline without
  that.
- **When** to cut the release: decided by a human merging the bot's
  Version Packages PR. Publishing is gated entirely on that merge; no
  schedule, no auto-merge, no workflow that decides on its own that
  enough changes have accumulated.

No workflow step ever runs `npm publish` outside of a merge the Maintainer
explicitly performed. This is the same shape of automation already
established for provider guardrails and drift checks elsewhere in this
repo: agents and workflows execute mechanical, deterministic work; humans
retain every approval and release decision.

One-time setup outside this repo's control: the Maintainer must create an
npm automation token and add it as the `NPM_TOKEN` GitHub Actions secret.
npm's Trusted Publishing (OIDC) flow, which removes the need for a stored
token, is a natural next step once this token-based flow is proven —
noted here rather than adopted now, since it requires npmjs.com-side
package configuration outside this repo.

### CI: website build gate

`.github/workflows/test.yml` gains a `website` job that runs
`npm run website:build` on every PR and push to `main`. This does not
change how the website deploys (Vercel's Git integration is unaffected)
— it only ensures a broken Astro build fails CI before merge, rather than
being discovered after the fact at Vercel's own build step.

### Website version badge: derived, not hand-maintained

`packages/website/src/components/Nav.astro`'s version badge previously
hardcoded a literal version string, which had already drifted from the
published CLI version and required manual correction twice in a single
day. It now imports `packages/agentquilt-cli/package.json` directly and
renders its `version` field, so the badge can never drift from the
package Changesets is versioning again.

## Consequences

Positive:

- No more manual `npm publish` from a laptop; no more manually-maintained
  `CHANGELOG.md` at release time.
- The release decision surface is smaller and more visible: a single PR
  (the Version Packages PR) shows exactly what's about to ship before it
  ships.
- npm provenance gives consumers a verifiable build attestation.
- A broken website build can no longer merge silently.
- The recurring version-badge drift bug class is eliminated at the source
  rather than being fixed reactively again.

Negative:

- Adds a devDependency surface (`@changesets/cli`,
  `@changesets/changelog-github`) and a third-party GitHub Action
  (`changesets/action`) to the release path.
- The `NPM_TOKEN` secret is a long-lived credential in GitHub Actions
  until Trusted Publishing replaces it.
- Changesets' generated changelog format (`### Major/Minor/Patch Changes`)
  differs from the hand-written "Keep a Changelog" categorization
  (`### Added/Fixed/Changed`) used in `CHANGELOG.md` up to this point;
  future entries will look structurally different from past ones in the
  same file.
