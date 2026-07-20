# Agentic SDLC -- Final Operating Model

Date: 2026-07-14
Status: Built (Phase 10 segment 3). Source design:
[pilot-tuning-and-operating-model.md](pilot-tuning-and-operating-model.md)
section 6 (D7, approved as recommended -- deferred from segment 2 until
real pilot evidence existed for the two topics that needed it; that
evidence now exists, see section 0 below). This document is deliberately
a synthesis document: five of its eleven required topics are pure
cross-reference to material that already fully answers them (sections 1,
2, 5, 6, 10 below); the other six required genuinely new prose (sections
3, 4, 7, 8, 9, 11), written here for the first time. Companion documents:
[claude-code-pipeline.md](claude-code-pipeline.md),
[codex-pipeline.md](codex-pipeline.md) (both provider pipelines, both
now with corrected, current status headers per Phase 10's own
documentation-task pilot instance -- see
[pilot-results/documentation-task-2026-07.md](pilot-results/documentation-task-2026-07.md)),
[agent-portfolio.md](agent-portfolio.md) (the 14-agent portfolio and its
routing matrix), [controlled-multi-agent-parallelism.md](controlled-multi-agent-parallelism.md)
(the multi-agent coordination contract), [github-provider-handoff.md](github-provider-handoff.md)
(the GitHub-to-session mechanics), [risk-and-approval-policy.md](risk-and-approval-policy.md)
(the absolute rules and approval-gate triggers), [maintenance-policy.md](maintenance-policy.md)
(Phase 10 segment 2 -- owners, review cadence, and the other maintenance
topics this document does not restate), [guardrails-design.md](guardrails-design.md)
(the provider-native guardrail mechanisms section 8 below governs review
of), [pilot-tuning-and-operating-model.md](pilot-tuning-and-operating-model.md)
(the Phase 10 design document this whole document executes).

## 0. What this document's claims rest on -- read this before the rest

This document distinguishes two kinds of source, explicitly, throughout:

- **Documented, already-verified pipeline design** (Phases 4, 5, 6, 9):
  the mechanics of both providers' pipelines, their guardrails, and the
  coordination contract are real, thorough, and already built and
  confirmed live -- `claude-code-pipeline.md`, `codex-pipeline.md`,
  `guardrails-design.md`, and `controlled-multi-agent-parallelism.md`
  are cited directly wherever a claim rests on this kind of source.
- **Actual Phase 10 pilot evidence** (this phase, segments 2-3): real,
  organically-scoped work run through the pipeline and scored. As of this
  document, **all Phase 10 pilot evidence executed so far is Claude
  Code-side only**:
  - The documentation-currency pilot instance (`pilot-results/documentation-task-2026-07.md`).
  - The medium-feature ESLint-configuration pilot instance
    (`pilot-results/medium-feature-eslint-config-2026-07.md`).
  - The D1 cross-reference to Phase 8's scenario-1 run
    (`evals/results/claude-code/01-isolated-bug-fix-2026-07.md`), also
    Claude Code.

  **No Codex-side pilot instance has been run in Phase 10.** Phase 8's own
  Codex-side proof-of-mechanics run also remains outstanding (its own D8
  completion bar requires at least one scored run per provider;
  `evals/results/summary.md` still shows "Codex side not yet performed").
  Sections 3 and 4 below (when to use Claude Code / when to use Codex) are
  the two topics this asymmetry bears on most directly, and each is
  written to say explicitly, claim by claim, whether it rests on actual
  Phase 10 execution evidence or on the existing (thorough, but not
  this-phase-executed) Codex pipeline documentation from Phases 5, 6, and
  9. No claim below overstates Codex-side evidence that does not exist.

## 1. How to start each workflow

**Fully answered by existing documentation; no new design needed.**
[github-provider-handoff.md](github-provider-handoff.md) is the
authoritative mechanical answer to "I have a GitHub issue or PR number,
how do I start a session against it," for both providers:

- **Claude Code**: `gh issue view`/`gh pr view`/`gh pr diff` (via the `gh`
  CLI directly, or let Claude Code invoke `gh` itself through its `Bash`
  tool) or Claude Code's native GitHub MCP integration
  (`mcp__plugin_github_github__*`), then invoke the matching skill by
  name from `claude-code-pipeline.md`'s own table: `analyze-issue`
  (new, not yet classified), `develop-issue` (full loop),
  `implement-task` (one approved task), `review-tree` (review an
  existing diff), `fix-ci` (red CI), or the `/prepare-pr` /
  `/release-readiness` commands.
- **Codex**: the same `gh` CLI commands (Codex has no bundled GitHub MCP
  integration, confirmed absent in Phase 5's build), then invoke the
  matching skill from `codex-pipeline.md`'s own table:
  `analyze-issue`, `standard-development` (Codex's full-loop equivalent
  to `develop-issue`), `implement-task`, `review-tree`, `fix-ci`, or the
  `prepare-pr` / `release-readiness` skills.

For work with no GitHub issue or PR (an ad hoc real-world task, or one of
this phase's own pilot instances), the equivalent starting point is simply
opening a session at the repository root and describing the task directly
-- both providers' skill sets are triggered by task description, not
exclusively by GitHub content; `github-provider-handoff.md` covers the
GitHub-sourced case specifically because that is the one step neither
pipeline document states on its own.

## 2. Which workflow profile to choose

**Fully answered by existing documentation; no new design needed.**
[task-classification.md](task-classification.md) defines the three
profiles (small, standard, high-risk) and their trigger checklist;
[agent-portfolio.md](agent-portfolio.md) section 5.1 states the exact
stage sequence and engaged agents per profile:

| Profile | Stage sequence (agent-portfolio.md section 5.1, quoted directly) |
| ------- | ------------------------------------------------------------------ |
| Small | INV-light: repository-analyst (or the session directly) -> IMP: feature-implementer -> VER: feature-implementer runs focused tests -> REV as diff review: architecture-reviewer -> completion checks + PRP: feature-implementer. No planner artifact; classification is one line. |
| Standard | CLS+PLN: implementation-planner -> INV: repository-analyst -> APP (only if the plan flags a trigger): Maintainer -> IMP: feature-implementer per bounded task -> VER: test-engineer -> REV: architecture-reviewer -> COR: feature-implementer + original reviewer -> RGR: regression-reviewer -> DOC: documentation-reviewer -> VAL: test-engineer -> PRP: feature-implementer, Maintainer merges. |
| High-risk | As standard, plus: parallel repository-analyst instances at INV (disjoint questions); architecture plan section in PLN; APP mandatory; specialist reviews alongside REV per section 5.2 triggers; RGR with explicit compatibility verification; full evidence package at VAL; REL when release behavior is affected. |

`agent-portfolio.md` section 5.2 additionally gives a task-type-to-profile
lookup table (documentation fix -> small; ordinary feature -> standard;
schema/persisted-format change -> high-risk with mandatory APP; and so
on), with an explicit escalation rule: any trigger discovered mid-flight
reclassifies upward immediately.

This is one of the two acceptance criteria this document confirms rather
than newly establishes -- see section 12.1.

## 3. When to use Claude Code

**Claim-by-claim sourcing, per section 0's discipline:**

- **Resting on actual Phase 10 pilot execution evidence**: both of
  Phase 10's own real pilot instances (the documentation-currency fix
  and the ESLint-configuration addition) ran on Claude Code and both
  completed cleanly -- zero human corrections, zero scope creep, zero
  generated-file mistakes, on the first attempt (per each instance's own
  metrics table). This is direct, if narrow, evidence that Claude Code's
  orchestrator-session model handles small-to-medium, single-provider,
  single-session documentation and configuration tasks well. It is NOT
  evidence that Claude Code is better than Codex at these tasks -- no
  Codex-side comparison instance exists yet (section 0) -- only that
  Claude Code handled them correctly when used.
- **Resting on existing pipeline documentation (Phases 4, 6, 9), not this
  phase's own execution**: `claude-code-pipeline.md` and
  `controlled-multi-agent-parallelism.md` document several Claude-Code-
  specific native capabilities with no direct Codex equivalent, confirmed
  by Phase 9's own direct tool-schema investigation (not re-derived
  here):
  - **`Agent(isolation: "worktree")`** is a first-class, single tool
    parameter for spawning an isolated, write-capable subagent
    (`controlled-multi-agent-parallelism.md` section 3.1) -- Codex's
    equivalent requires the Maintainer to manually create separate `git
    worktree`s and run independent Codex sessions inside each (section
    3.2 of that same document), a real but structurally heavier
    mechanism. **Prefer Claude Code when a task's own design plausibly
    calls for worktree-isolated parallel work** (most concretely: a
    future write-parallel trial per that document's own section 6,
    still unexercised as of this document -- see
    `maintenance-policy.md` section 8's graduation-criteria treatment).
  - **Per-agent Bash-scoping** (`claude-code-pipeline.md`'s Phase 6 D2
    hook, confirmed firing live during Phase 9's own investigation) lets
    each of the 14 agent definitions carry a distinct, narrower allowed-
    command list than Codex's own global (not per-agent) `PreToolUse`
    guard can express (`codex-pipeline.md`'s corrected D6 section,
    `guardrails-design.md` section 4.2's documented Codex limitation:
    "Codex's `PreToolUse` payload has no caller-identity field").
    **Prefer Claude Code when per-role write-permission precision
    specifically matters** for the task at hand (for example, a task
    where `test-engineer`'s narrower test-only write scope needs to be
    enforced more tightly than Codex's uniform hook can express).
  - **`SendMessage`-based segment resumption** (used throughout this
    very nine-phase effort, `execution-model.md` section 7 step 3) is a
    native Claude Code mechanism for continuing a long-running,
    multi-segment task without losing context -- there is no documented
    Codex equivalent surveyed in this effort's own Codex investigation.
    **Prefer Claude Code for genuinely long, multi-segment, gate-heavy
    work** (mirroring how this very effort's own phase-executor pattern
    is built entirely on this mechanism).

## 4. When to use Codex

**Claim-by-claim sourcing, per section 0's discipline:**

- **No Phase 10 pilot execution evidence exists for Codex** -- stated
  plainly, not worked around. Every claim in this section rests on
  Phases 5, 6, and 9's own documented pipeline design and Phase 9's own
  direct tool/configuration investigation, not on an actual Phase 10 run.
- **`codex exec` as native, human-initiated batch concurrency**
  (`codex-pipeline.md` section 2.7, `controlled-multi-agent-parallelism.md`
  section 3.2): a Maintainer can run multiple independent `codex exec`
  invocations in separate terminal sessions, each a fully independent
  Codex process with its own sandbox -- genuine "configured concurrency"
  with no equivalent primitive documented for Claude Code (Claude Code's
  own concurrency is via the `Agent` tool's `run_in_background`/
  `isolation` parameters from inside a single session, not independent
  terminal-level processes a Maintainer scripts directly). **Prefer
  Codex when a task is naturally expressible as several fully
  independent, terminal-scriptable invocations** the Maintainer wants
  to kick off and monitor outside any single session's own turn-taking.
- **A custom permission-profile system with real per-command allow-list
  granularity at the project-config layer** (`codex-pipeline.md`'s
  corrected D1 section; `.codex/config.toml`'s own comments): Codex's
  `default_permissions`/`[permissions.<profile>]` system at the
  project-scoped layer is a genuine capability with no equivalent
  granularity in Claude Code's own `permissions.deny`-based system
  (Claude Code's own deny-list is path/command-pattern based, not a
  named, extensible permission-profile object). Note the corrected
  nuance from Phase 10's own documentation-currency pilot instance: this
  granularity applies at the PROJECT layer, not per individual custom
  agent (per-agent scoping on Codex uses `sandbox_mode` only, a coarser
  mechanism) -- so this advantage is narrower in practice than the
  original Phase 5 design assumed before the correction.
- **A leaner, narrower specialist naming convention** (`codex-pipeline.md`
  section 4, Phase 9's cross-reference section 4.2): Codex's
  `repository-explorer` (not `repository-analyst`) and `test-reviewer`
  (narrower-scoped to read-only adequacy review, not full test execution
  like Claude Code's `test-engineer`) are deliberate, documented
  divergences from Claude Code's naming, not accidental drift. **Prefer
  Codex when its own narrower `test-reviewer` scope (read-only adequacy
  review only, not execution) is specifically what a task needs** -- for
  example, a pure test-coverage-adequacy review with no intention of
  running or modifying tests in the same pass.
- **What is currently NOT a reason to prefer Codex, stated explicitly**:
  neither provider has been shown, by actual Phase 10 evidence, to
  produce higher-quality investigation, fewer review findings, or faster
  cycle time than the other for ordinary development work -- that
  comparison requires dual-provider pilot data this phase has not yet
  collected (see section 13's handoff note).

## 5. When to use multiple agents

**Fully answered by existing documentation; no new design needed.**
[controlled-multi-agent-parallelism.md](controlled-multi-agent-parallelism.md)
is the complete, approved, once-exercised coordination contract -- this
document references it rather than re-deriving it:

- **Read-heavy fan-out** (that document's section 4-5) is the routinely-
  usable default: up to 4 concurrent read-only subagents on genuinely
  disjoint questions, verified once via that document's own D2 (already
  authorized for the orchestrator's immediate use, formalizing three
  pre-existing precedents: `investigation-contract.md` rule 7,
  `agent-portfolio.md` section 5.1's high-risk parallel-investigation
  row, and `review-tree`'s own specialist fan-out). Section 2.2 of that
  document surveys what benefits from this: package-by-package
  investigation of a large future change, documentation-impact analysis
  across several `.docs/` subdirectories at once, and (already exercised
  once, per that document's own section 8) a wide cross-referencing
  investigation like Phase 9's own four-way pipeline cross-reference.
- **Write-parallelism** (that document's section 6) is fully specified
  but, per D7 there, deliberately **authorized-but-not-yet-exercised** --
  zero live trials exist on record as of this document. Per
  `maintenance-policy.md` section 8's graduation criteria (2-3 real
  successful trials, no correction-limit exhaustion, an explicit
  Maintainer graduation decision), it does not yet qualify as routine.
  **Do not reach for write-parallelism as a default** -- it remains a
  deliberately experimental capability pending its own first real trial.
- **When NOT to use multiple agents**, stated explicitly in that
  document's own section 2.2: small-profile tasks (fan-out overhead
  exceeds the benefit for a one-function bug fix), or any task whose
  read-heavy work is already fast enough serially that spawning,
  tracking, and synthesizing multiple agents costs more than doing it
  in one pass.

## 6. When human-led development is required

**Fully answered by existing documentation; no new design needed.**
[risk-and-approval-policy.md](risk-and-approval-policy.md) sections 2-3
state this precisely and are not restated in full here:

- **Section 2's absolute rules** (no exceptions, any profile): no agent
  approves a plan, approves a PR, merges, tags, pushes, publishes, or
  overrides CI; no agent performs a destructive operation without prior
  recorded human approval; release creation and publication are
  Maintainer-only; generated files are never hand-edited by an agent.
- **Section 3's approval-gate trigger table**: high-risk architecture
  change, public interface change, new dependency, persisted-format
  change, generated-output semantics change, destructive operation, and
  release each require a stop-and-record-a-decision before an agent
  proceeds.

This is the second of the acceptance criteria this document confirms
rather than newly establishes for a different reason than section 2 --
see section 12.

## 7. How to update agents and skills

**Partially new -- the Claude Code half already had a clear procedure;
the Codex half and both providers' skills needed to be stated explicitly
for the first time here.**

- **Claude Code agent definitions** (compiler-managed): edit the source
  fragment under `.agentquilt/agents/<name>/`, run `npx agentquilt
  build`, then `npx agentquilt check` (must exit 0, zero drift) --
  `agent-portfolio.md` section 9's own segment-2 build procedure, the
  exact mechanism this repository has used for every agent-definition
  change across Phases 3-9. **Never hand-edit the compiled
  `.claude/agents/<name>.md` output directly** -- this is the same
  Generated Files Policy this whole effort's own documentation-currency
  pilot instance (section 3.5 of the design doc) exists to model
  compliance with, not just describe.
- **Codex custom agents** (`.codex/agents/*.toml`): these are NOT
  compiler-managed (`codex-pipeline.md` section 2.1, unchanged by any
  later phase) -- edit the `.toml` file directly. There is no build step
  and no drift check equivalent to `agentquilt check` for this path,
  since AgentQuilt does not compile Codex custom-agent files. After
  editing, run the discovery check from section 9 below
  (`codex exec "list the custom agents available to you in this
  project"`) to confirm the edited agent is still recognized correctly,
  and re-run the guardrail empirical test from
  `maintenance-policy.md` section 3 if the edit touches
  `sandbox_mode` or `developer_instructions` permission-relevant text.
- **Claude Code skills** (`.claude/skills/*/SKILL.md`): hand-authored,
  unmanaged by AgentQuilt (`claude-code-pipeline.md` section 2.3's own
  D2 decision, deliberately choosing NOT to route pipeline skills through
  the `agentskills` compiler adapter to preserve the ADR-0012 product/
  pipeline boundary) -- edit the file directly; no build step.
- **Codex skills** (`.agents/skills/*/SKILL.md` plus each skill's
  `agents/openai.yaml` sidecar): same principle, hand-authored and
  unmanaged (`codex-pipeline.md` section 2.3/9's own D2 decision, for the
  identical ADR-0012 reason) -- edit the file directly; no build step.
- **Common to all four categories**: after any edit, re-run the relevant
  provider's own discovery/recognition check (section 9 below) before
  trusting the edited agent or skill in real work, and route the edit
  through the review discipline `maintenance-policy.md` section 4 already
  defines (wording-only edits get documentation-reviewer-equivalent
  review at minimum; scope/trigger/routing changes additionally get
  architecture-reviewer-equivalent review).

## 8. How to review provider configuration changes

**New synthesis, grounded in an existing precedent
(`guardrails-design.md`'s own segment-2 acceptance-test pattern).**

A change to any of the following is treated as inherently higher-stakes
than an ordinary source-fragment or skill edit, regardless of how small
the diff looks, because each one affects every future agent's permission
boundary, not just the one task that motivated the change:

- `.claude/settings.json` (Claude Code's `permissions.deny` block and
  per-agent Bash-scoping hook).
- `.codex/config.toml` (Codex's project-level `default_permissions`).
- `.codex/hooks.json` and `.codex/hooks/pretooluse-guard.sh` (Codex's
  global `PreToolUse` guard).
- Any individual `.codex/agents/*.toml` file's `sandbox_mode` setting.

**Review procedure**: (1) `architecture-reviewer`-equivalent review of
the diff itself, checking it against the specific guardrail goal it is
supposed to serve (does the new rule actually deny the pattern it claims
to, does it avoid unintentionally over-broadening an existing allow); (2)
a direct empirical test on a scratch branch -- attempt the exact action
the change is supposed to deny (or, for a newly-loosened permission,
attempt the exact action that should now be newly allowed) and confirm
the observed behavior matches the diff's own intent, exactly mirroring
`guardrails-design.md`'s own segment-2 acceptance-test pattern (create a
scratch branch, never check it out for anything beyond the minimal
action needed, delete it after, never actually perform a destructive or
publishing action even in dry-run form where a non-destructive proxy
observation is available instead, per this whole effort's own standing
discipline). A provider-configuration change is not considered complete
until both steps have run, not just the first.

## 9. How to validate hooks after provider upgrades

**New -- no existing document addressed a recurring revalidation
procedure before this one; every prior hook validation (Phase 6's own
acceptance tests, Phase 9's confirmed-firing observation mid-
investigation) was a one-time, build-time check.**

This procedure is the operational partner to
`maintenance-policy.md` section 3's own trigger ("whenever the Maintainer
upgrades the Claude Code or Codex CLI version") -- that document names
when to run this; this section states what to actually do, in full
(restated here rather than only cross-referenced, since this specific
topic is one of the phase doc's own 11 required items and deserves a
direct answer in this document, not only a pointer):

1. **Guardrail empirical test, one per provider**, on a scratch branch,
   never `main`, never pushed:
   - Claude Code: attempt an `Edit`/`Write` on `CLAUDE.md` directly;
     confirm `.claude/settings.json`'s `permissions.deny` still fires
     with a visible denial reason in the transcript.
   - Codex: attempt the equivalent `apply_patch`-shaped edit against the
     same generated-file set; confirm `.codex/hooks.json`'s
     `PreToolUse` hook still fires. Inspect the hook's own matcher logic
     against an absolute-rule command string (`git push`, `npm publish`,
     etc.) without actually executing it, per this effort's own standing
     "never perform a destructive or publishing operation just to prove
     a guardrail" discipline.
2. **Custom-agent/skill discovery check**:
   - Codex: `codex exec "list the custom agents available to you in
     this project"` (non-interactive, human-run) -- confirm all 14 names
     still appear, exactly as `codex-pipeline.md` section 10's own
     validation-plan item already specifies, now restated as a
     RECURRING check rather than a one-time build-time step.
   - Claude Code: in a plain interactive session, confirm the 14
     `.claude/agents/*.md` files are still recognized and invocable by
     name.
3. **If either check fails**: treat it as a blocked-severity finding
   against this effort's own artifacts until resolved -- a silently
   broken guardrail after a provider upgrade is exactly the kind of
   regression this whole effort exists to prevent, and should not be
   treated as a routine, low-priority cleanup item.

Both checks are cheap (a few minutes each), fully provider-native (no new
tooling), and were not, and do not need to be, exercised as a Phase 10
pilot instance to be trustworthy -- they are direct extensions of
mechanisms (`guardrails-design.md`'s acceptance-test pattern,
`codex-pipeline.md`'s own discovery command) already empirically proven
once each.

## 10. How to retire obsolete agents

**Existing procedure, restated generically as a template; no new agent
is currently obsolete (see section 12.2).**
`agent-portfolio.md` section 9's own segment-2 build procedure (used for
the original 41-directory Phase 3 retirement) is the direct template:

1. Delete the `.agentquilt/agents/<name>/` source directory and its
   compiled outputs (`.claude/agents/<name>.md`, and, if the agent has a
   Codex counterpart, `.codex/agents/<name>.toml`) TOGETHER, in the same
   change -- not remove-source-then-rebuild, since `agentquilt build`/
   `check` do not prune orphaned compiled outputs on their own
   (`agent-portfolio.md` section 9.4's own finding, confirmed at Phase 3
   and unchanged since).
2. `git rm` both the source and the compiled output in the same commit.
3. Run `npx agentquilt build` then `npx agentquilt check` -- must exit 0,
   zero drift, confirming no other target unexpectedly references the
   removed agent.
4. Update any document that names the retired agent by name (gate
   policies, routing tables, other agents' own contracts that reference
   it) in the same change -- `agent-portfolio.md` section 9.7's own
   "repository-wide grep for references to retired agent names" step is
   the concrete mechanism, not a separate follow-up.
5. Retired content remains fully recoverable via git history (no
   destructive rewrite) -- `git log`/`git show` against the retiring
   commit is sufficient; no separate archive location is needed.

## 11. How to introduce support for another provider without adding a runtime

**New -- no existing document addresses a third provider.** The pattern
below is stated explicitly here for the first time, but it is not
invented from nothing -- it generalizes the concrete, repeatable choices
Phases 4, 5, and 6 already made twice (once for Claude Code, once for
Codex), each independently arriving at the same shape:

1. **Write one `<provider>-pipeline.md` design document**, following the
   same shape as `claude-code-pipeline.md`/`codex-pipeline.md`: what the
   provider's own native primitives are (custom-agent/subagent mechanism,
   permission/sandbox system, hook or guardrail surface, batch/
   non-interactive mode if any), how the existing 14-role portfolio maps
   onto the provider's own agent-definition format, and how each
   lifecycle stage's skill/command set is expressed in that provider's
   own idiom.
2. **Reuse the 14-role portfolio (`agent-portfolio.md`) unchanged** --
   do not invent new roles for the new provider. A new provider gets its
   own file-format expression of the same 8 core + 6 specialist
   contracts, exactly as Codex's `.codex/agents/*.toml` files express the
   same roles Claude Code's `.claude/agents/*.md` files do, under
   different names only where the provider's own primitives genuinely
   differ (Codex's `repository-explorer` vs. Claude Code's
   `repository-analyst`, both the same INV-stage contract).
3. **Reuse the lifecycle contracts unchanged** (`investigation-contract.md`,
   `implementation-plan-contract.md`, `review-contract.md`,
   `handoff-contract.md`, `completion-contract.md`,
   `task-classification.md`, `risk-and-approval-policy.md`) -- these are
   already provider-neutral by construction (written before Phase 4 chose
   a first provider), and no phase to date has needed to fork or
   duplicate any of them for a second provider.
4. **Use only the new provider's own native primitives** -- no new
   script, service, wrapper, or scheduling layer, mirroring the "no
   custom execution runtime" confirmation this whole effort has held to
   across nine phases (section 12.3). If the new provider lacks a native
   equivalent for some existing capability (as Codex lacks a first-class
   worktree-isolation tool parameter, `controlled-multi-agent-parallelism.md`
   section 3.2's own documented asymmetry), state the gap plainly in the
   new pipeline document rather than building a shim to paper over it.
5. **Design the provider's own guardrail layer against the same goals**
   `guardrails-design.md` already enumerates (generated-file protection,
   absolute-rule command denial, secret-filename protection), using
   whichever native mechanism the new provider actually offers (a
   declarative deny-list, a pre-tool-use hook, a sandbox/permission
   profile, or some combination) -- do not assume the new provider's
   mechanism will look like either existing one; `guardrails-design.md`
   section 3's own per-guardrail table (built for exactly two providers)
   is the template to extend to a third column, not a fixed two-column
   design.
6. **Add the new provider's own GitHub-handoff mechanics to
   `github-provider-handoff.md`** rather than creating a parallel
   document -- if the provider has a native GitHub integration (as
   Claude Code does), document it there; if it relies on the `gh` CLI
   only (as Codex does), document that instead.
7. **Validate with the same empirical acceptance-test pattern**
   `guardrails-design.md`'s own segment 2 and this document's own
   section 9 already use -- a new provider's guardrails are not trusted
   until they have been empirically fired against a real attempted
   denied action on a scratch branch, not merely designed on paper.

No step above requires writing code under `packages/agentquilt-cli/src/`,
adding a `package.json` dependency, or introducing a script under
`scripts/` -- consistent with every other topic in this document, a new
provider is a new pipeline document plus native configuration files, not
new product code or new custom tooling.

## 12. Acceptance criteria this document confirms

Per the coordinator's own instruction, the four criteria below are
confirmed here by citing this effort's own prior, already-completed
verification (Phase 10 segment 1's design doc, section 8) rather than
re-investigating them from scratch.

### 12.1 "Default small, standard, and high-risk workflows are established"

**Confirmed, already true before this phase, cited directly in section 2
above.** `agent-portfolio.md` section 5.1 states the exact stage sequence
per profile; `task-classification.md` defines the triggers that select a
profile; `agent-portfolio.md` section 5.2 maps common task types to their
typical classification. This was true as of Phase 3 (2026-07-12) and
remains true, unchanged by Phase 10.

### 12.2 "Obsolete agent definitions are removed or archived"

**Confirmed, already true, per the design doc's own section 8.1
verification (2026-07-13), not re-investigated here.** 41 directories
were retired in Phase 3 (`agent-portfolio.md` section 9.3's own named
list); a direct filesystem check found exactly 14 agent directories and
14 compiled outputs remain, none of the 41 retired names present in
either. Retired content remains fully recoverable via git history
(`acb27fc` for the pre-restructure layout), satisfying "archived" in the
stronger, recoverable sense, not merely "deleted." No agent has been
retired or added since that verification, so it remains current as of
this document.

### 12.3 "There is no custom execution runtime"

**Confirmed, already true, per the design doc's own section 8.2
verification (2026-07-13), not re-investigated here.** A direct
filesystem search for runtime- or scheduler-named files, and a grep
across `.docs/agentic-sdlc/` for any reference to building one, both
returned zero results. Every mechanism this nine-phase effort uses is a
native provider primitive (enumerated in that section). Section 11 above
extends this same discipline explicitly to any future third provider.

### 12.4 "AgentQuilt user-facing behavior remains independent of the development pipeline"

**Confirmed, already true, per the design doc's own section 8.3
verification (2026-07-13), not re-investigated here.** Exactly two
`packages/agentquilt-cli/src/` commits postdate the effort's 2026-07-11
start: one same-day, unrelated repository-layout refactor, and one
Phase 1's own approved, gated deletion of dead, never-shipped code.
Neither adds pipeline-driven product functionality. No Phase 2-10
deliverable has ever changed what `agentquilt build`/`check`/`init`/
`agents add`/`skills add` do for an end user. This document adds no new
exception -- everything in this document concerns files under
`.docs/agentic-sdlc/`, `.agentquilt/agents/`, `.claude/`, and `.codex/`,
never `packages/agentquilt-cli/src/`.

## 13. What remains outside this document's own scope

Per the coordinator's explicit segment-3 boundary, this document does not
execute or newly recommend executing any further pilot category. The
deferred categories recorded in
[pilot-results/README.md](pilot-results/README.md)'s "Still deferred"
section (a second, genuinely blind low-risk-bug instance; provider-output
change; CI failure; the refactor instance; release preparation; the
high-risk architecture/schema category) remain exactly as deferred there,
untouched by this document. Most directly relevant to sections 3-4 above:
**a genuine dual-provider comparison for ordinary development work does
not yet exist** -- the single most valuable next real-work data point for
sharpening this document's own "when to use Claude Code / when to use
Codex" sections would be a Codex-side run of either of Phase 10's own two
executed pilot instances' task shape, or Phase 8's own outstanding
Codex-side proof-of-mechanics run. Neither is attempted by this document;
both are named here as a concrete, well-scoped candidate for whichever
future real-work opportunity or Maintainer-paced checklist item takes
this up next.
