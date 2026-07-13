# Agentic SDLC -- Maintainer-to-Provider GitHub Handoff

Date: 2026-07-13
Status: Built (Phase 7 segment 2 deliverable).
Companion documents: [github-ci-integration.md](github-ci-integration.md)
(the Phase 7 design this document's section 6.2 draft came from),
[claude-code-pipeline.md](claude-code-pipeline.md),
[codex-pipeline.md](codex-pipeline.md) (what happens once a session is open
and a skill/command is invoked -- this document covers only the step before
that: getting a GitHub issue or PR's content into the session in the first
place).

## Purpose

This document is the answer to one specific, mechanical question: "I have a
GitHub issue number or PR number. How do I start a Claude Code or Codex
session against it?" Phase 4's and Phase 5's pipeline documents both assume
a session is already open with the relevant content in context; neither
states how that content gets there. This document closes that gap.

Binding constraint, restated because it is the one this document exists to
make concrete: **the provider may use its native GitHub integration or the
local `gh` CLI, but this repository must not include a custom
API-invocation layer.** No file in this repository calls `api.github.com`
programmatically on an agent's behalf outside of a session a human started
interactively. This document names only mechanisms that already exist,
either as GitHub's own official tooling (`gh` CLI) or as a provider's own
official integration (Claude Code's GitHub MCP server).

## What CI does NOT do

None of the workflows under `.github/workflows/` invoke Claude, Codex, or
any model API -- confirmed by this repository's own CI design
(`github-ci-integration.md` section 5, `guardrails-design.md`). This means
there is no automatic trigger that starts an agentic-loop session on a new
issue or PR; a maintainer always performs the handoff steps below by hand,
in an interactive terminal, before any Claude Code or Codex session begins
working on a GitHub-sourced task. This is a deliberate design choice, not an
oversight -- see this repository's own `[RETRACTED]` history (root
`CLAUDE.md`, "Claude API integration (former Phases 3.1-3.3)") for why an
automated agent-invocation layer was built once and then removed.

## Claude Code path

Two equally valid mechanisms exist; use whichever is already configured in
your environment:

1. **`gh` CLI** (already installed and used by this repository's own
   workflows via `actions/github-script`, so it is a mechanism this
   repository already depends on, not a new one introduced here):

   ```
   gh issue view <number> --json title,body,labels,comments
   gh pr view <number> --json title,body,files,comments
   gh pr diff <number>
   ```

   Pipe or paste the relevant output into the Claude Code session's prompt,
   or reference the issue/PR number directly in the prompt and let Claude
   Code invoke `gh` itself via its `Bash` tool (subject to the existing
   `.claude/settings.json` permission rules from Phase 4/6 -- `gh pr merge*`
   and `gh release*` remain denied, `gh issue view`/`gh pr view`/`gh pr
   diff` are read-only and unaffected).

2. **Claude Code's native GitHub integration** -- the
   `mcp__plugin_github_github__*` tool surface (GitHub's own official MCP
   server, not a mechanism this repository built or maintains) is available
   directly inside a Claude Code session with no extra setup beyond the
   plugin being enabled. Tools such as `issue_read`, `pull_request_read`,
   and `search_issues` read the same content the `gh` CLI path would, from
   inside the session directly.

Once the issue/PR content is in context, invoke the appropriate skill by
name (Phase 4's `.claude/skills/`):

- New issue, not yet classified: `analyze-issue`.
- Full development loop on an issue: `develop-issue`.
- Reviewing an existing PR's diff: `review-tree`.
- A specific approved task: `implement-task`.
- Red CI on an existing PR/branch: `fix-ci`.

## Codex path

Codex has no equivalent bundled GitHub MCP integration in this repository's
`.codex/` configuration (confirmed absent in Phase 5's build). The `gh` CLI
is therefore the single mechanism for the Codex path:

```
gh issue view <number> --json title,body,labels,comments
gh pr view <number> --json title,body,files,comments
gh pr diff <number>
```

Paste the relevant output into the Codex session's prompt, or reference the
issue/PR number directly and let Codex invoke `gh` itself via its shell
access (subject to each custom agent's own `sandbox_mode` from Phase 5/6 --
read-only agents can run `gh issue view`/`gh pr view`/`gh pr diff` since
these are read-only network calls under Codex's sandboxing model in the same
way read-only `git` commands are permitted; `gh pr merge*` and `gh
release*` remain denied globally by the Phase 6 `.codex/hooks/
pretooluse-guard.sh` D1 hook).

Once the issue/PR content is in context, invoke the appropriate skill by
name (Phase 5's `.agents/skills/`):

- New issue, not yet classified: `analyze-issue`.
- Full development loop on an issue: `standard-development`.
- Reviewing an existing PR's diff: `review-tree`.
- A specific approved task: `implement-task`.
- Red CI on an existing PR/branch: `fix-ci`.

## Explicit non-mechanism statement

Neither path involves a webhook, a GitHub App, a bot account, or any code in
this repository that calls the GitHub API on an agent's behalf outside of an
interactive CLI session a human started. There is no `issue_comment` or
`pull_request` trigger anywhere in `.github/workflows/` that invokes either
provider (confirmed in `github-ci-integration.md` section 5.3's explicit
non-goals list, unchanged by this phase's build). If no maintainer performs
the steps above, no Claude Code or Codex session ever starts on a given
issue or PR -- there is no automatic fallback.

## Provider-native GitHub Actions: evaluated, not adopted

Anthropic publishes a Claude Code GitHub Action that can run inside a
workflow, triggered by an `@claude` mention or a label, and post results as
a PR comment or commit suggestion. This is a real, documented,
provider-native mechanism -- not a custom API layer this repository would
build. It is deliberately not adopted as part of this repository's default
CI, for three reasons (unchanged from the Phase 7 design's evaluation):

1. It would be the first workflow step requiring a repository secret (an
   API key), a new category of operational surface this repository has none
   of today.
2. It would blur the "agents run in provider CLIs, invoked manually by a
   maintainer, CI stays deterministic" model this repository has
   deliberately maintained since the Phase 3.1-3.3 retraction.
3. Even as a non-required, informational-only check it would need its own
   cost/rate-limit/trust-boundary design outside this phase's scope.

This remains available as a future option if a later phase or the
Maintainer decides to revisit it -- named here so the option is not lost,
not adopted here so default CI stays deterministic and model-free, exactly
as the Phase 7 phase doc requires.
