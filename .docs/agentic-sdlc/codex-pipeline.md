# Agentic SDLC -- Codex-Native Development Pipeline (Proposal)

Date: 2026-07-13
Status: Proposal (Phase 5 segment 1 deliverable; awaiting Maintainer approval at
the gate recorded in section 9). Not yet built -- this document specifies what
segment 2 creates, after approval, and nothing under `.codex/`, `.agents/skills/`,
or `AGENTS.md` has been changed to produce it.
Companion documents: [agent-portfolio.md](agent-portfolio.md) (the 14-agent
portfolio this pipeline routes to; section 6 role contracts are the normative
source and are not restated here), [lifecycle.md](lifecycle.md) (stage catalog
and profiles), the eight standard artifact contracts
([task-classification](task-classification.md),
[risk-and-approval-policy](risk-and-approval-policy.md),
[investigation-contract](investigation-contract.md),
[implementation-plan-contract](implementation-plan-contract.md),
[review-contract](review-contract.md),
[validation-evidence](validation-evidence.md),
[handoff-contract](handoff-contract.md),
[completion-contract](completion-contract.md)),
[ADR-0012](../architecture/adr/ADR-0012-provider-native-agentic-sdlc-boundary.md)
(provider-native boundary, including the hook-necessity bar in point 7), and
[claude-code-pipeline.md](claude-code-pipeline.md) (the Claude Code-native
counterpart this document is the Codex-native sibling of -- same Phase 2
contracts and same 14-agent portfolio, different provider mechanisms; read for
comparison, not copied).

## 1. Purpose and scope

This document is the Codex-native implementation design for the same standard
AgentQuilt development loop Phase 4 implemented for Claude Code: 8 required
workflows (analyze an issue, plan a change, run the standard development loop
end to end, implement one bounded task, review the working tree, diagnose
failing CI, prepare a pull request, assess release readiness), expressed as
Codex-native project-scoped custom agents and skills that implement the
identical Phase 2 contracts and route to the same 14-agent portfolio's role
contracts ([agent-portfolio.md section 6](agent-portfolio.md#6-role-contracts)).
It does not mechanically translate the six Claude Code skills and two commands
Phase 4 built -- Codex's own primitives (project-scoped custom agents with
per-agent sandbox enforcement, `.agents/skills/*/SKILL.md`, and native hooks)
suggest a different shape, detailed in section 3.

Binding constraints carried over from the master prompt and ADR-0012, not
repeated at each section below: development infrastructure only, no
AgentQuilt product feature, no change to `packages/agentquilt-cli/src/`, no
Codex adapter added to the AgentQuilt compiler, no custom runtime/SDK/
orchestrator, no CI workflow invokes a model, canonical sources edited and
generated files only rebuilt (root `AGENTS.md` included -- see section 2 on why
this repository's root `AGENTS.md` is NOT the right place for Codex-specific
instructions), plain text only (no emojis, smileys, pictographic symbols, or
em/en-dashes -- ASCII `--` throughout, per the corrective finding from Phase 4
segment 2, applied from the start here).

## 2. Current-state findings (inspection, this segment)

Verified 2026-07-13 in this environment, on branch
`refactor/agentic-sdlc-boundary-cleanup`:

### 2.1 Codex CLI is installed and usable

- **Binary**: `/usr/local/bin/codex`, installed via the `@openai/codex` npm
  package (global). **Version**: `codex-cli 0.144.1` (`codex --version`).
  `codex doctor` confirms a healthy install (system, runtime, install
  consistency, search/ripgrep, git all green); it flags an available update to
  `0.144.3` (informational, not a blocker for this segment) and a network
  `reachability` warning for provider endpoints, which does not affect local,
  read-only investigation.
- This is a materially different starting point than Phase 4's Claude Code
  counterpart (which had a single confirmed interactive version). Codex is a
  full CLI with real subcommands relevant to this design:
  `exec` (`e`, non-interactive), `review` (non-interactive code review against
  a diff or commit), `apply` (`a`, apply the last diff via `git apply`),
  `resume`/`fork` (session continuation), `sandbox` (run a command inside the
  Codex sandbox directly), `mcp`/`mcp-server`, `doctor`, and `plugin`. `exec`
  and `review` both accept `-s/--sandbox {read-only|workspace-write|
  danger-full-access}` and `-c key=value` config overrides directly on the
  command line -- this is native, first-class, not an assumption.
- **No `.codex/` directory exists in this repository** (`ls .codex` fails
  before this segment). No project-scoped Codex config, agents, hooks, or
  skills exist yet. This confirms segment 2 is a clean build with nothing to
  reconcile.
- **A rich `~/.codex/` home directory already exists** on this machine
  (`auth.json`, `config.toml`, `skills/`, `plugins/`, `rules/default.rules`,
  session/state databases). This is the operator's personal Codex
  installation, shared across many unrelated repositories (`nutrition-
  assistant`, `coffee-guru-app`, `bikehud`, etc. -- visible as
  `[projects."<path>"]` trust entries in `~/.codex/config.toml`). This
  repository (`/Users/sergeikochetkov/devel/agentquilt`) already has
  `trust_level = "trusted"` recorded there, which is load-bearing (section 2.4
  below): a trusted project is a precondition for Codex to load ANY
  project-scoped `.codex/` layer this design proposes to add.
- `~/.codex/skills/` already contains real, non-trivial skills from this
  machine's personal Codex use (`ticket-branch-pr`, `playwright`, `figma`,
  `build-monkey-c-app`, plus `.system/` built-ins: `skill-creator`,
  `plugin-creator`, `skill-installer`, `openai-docs`, `imagegen`). Each
  follows the exact `SKILL.md` + `agents/openai.yaml` shape documented in
  section 2.3 below -- this is empirical, on-disk confirmation of the
  documented schema, not just a documentation claim. These are personal
  (`$HOME/.agents`-equivalent, actually `~/.codex/skills`, a distinct
  user-level location -- see section 2.3) and out of scope for this design;
  they are cited only as corroborating evidence of the schema.

### 2.2 Sandbox modes, permission profiles, and approval policy -- verified against current documentation

Fetched from the current, authoritative OpenAI documentation
(`developers.openai.com/codex/*`, redirecting to `learn.chatgpt.com/docs/*`;
both hosts serve the same current reference) on 2026-07-13:

- **Two systems exist and do not compose.** The legacy pair is
  `sandbox_mode` (`read-only | workspace-write | danger-full-access`) plus
  `approval_policy` (`untrusted | on-request | never | on-failure`, or a
  granular object with boolean flags for `sandbox_approval`, `rules`,
  `mcp_elicitations`, `request_permissions`, `skill_approval`). The current,
  recommended system is **permission profiles**: `default_permissions =
  "<profile>"` plus `[permissions.<profile>]` tables, with three built-ins --
  `:read-only` (local command execution stays read-only), `:workspace`
  (writes allowed inside the active workspace roots and system temp
  directories), `:danger-full-access` (no local sandbox restriction) -- and
  custom profiles definable via `[permissions.<name>]` with `extends`.
  Documentation is explicit: "Don't combine with `sandbox_mode` or
  `[sandbox_workspace_write]`." This design uses the current permission-
  profile system exclusively (decision D1) -- the built-in profile names
  (`:read-only`, `:workspace`, `:danger-full-access`) map directly onto the
  phase doc's three required sandbox modes and this portfolio's existing
  `permissions: read-only | workspace | full` vocabulary in
  [agent-portfolio.md section 8](agent-portfolio.md#8-expressible-manifest-surface-no-compiler-changes),
  which is a naming coincidence worth noting, not a coupling -- AgentQuilt's
  manifest vocabulary is not read by Codex and this design does not attempt
  to unify them.
- **`sandbox_mode`/`approval_policy` are user-level and cannot be overridden
  in project-scoped config** per the fetched reference. This is a material
  fact for D1: if this design had chosen the legacy pair, a project-scoped
  `.codex/config.toml` could not actually set it -- only the current
  `default_permissions`/`[permissions]` system is settable at the project
  layer, which independently confirms D1's choice is not just "current" but
  the only one that actually works project-scoped.
- **Per-agent overrides**: a custom agent TOML file (section 2.4) may set its
  own `sandbox_mode` (legacy key name still accepted in that context per the
  fetched subagent reference) or, by the same config-layering model, its own
  permission profile -- confirmed by the fetched subagents reference: "Optional
  fields such as ... `sandbox_mode` ... inherit from the parent session when
  you omit them," meaning a custom agent file is itself a config layer that
  CAN set this key to override the parent. Segment 2 verifies empirically
  (section 10) whether a custom agent's own `[permissions]` table is honored
  the same way `sandbox_mode` is documented to be, since the fetched subagent
  page's worked examples use the legacy key name.

### 2.3 `.agents/skills/*/SKILL.md` -- confirmed Codex-native discovery, and the AgentQuilt-adapter coincidence

- Fetched documentation states plainly: Codex scans `.agents/skills` "in
  every directory from your current working directory up to the repository
  root" (repository level), plus `$HOME/.agents/skills` (user level), plus
  `/etc/codex/skills` (admin level), plus built-in system skills. Required
  frontmatter is exactly `name` and `description`; optional `agents/
  openai.yaml` (a sibling directory inside the skill directory, NOT
  frontmatter) carries `interface` (`display_name`, `short_description`,
  `default_prompt`) and `policy` (`allow_implicit_invocation`) -- confirmed
  both by documentation and by every skill on disk in `~/.codex/skills/*/
  agents/openai.yaml` (section 2.1). Explicit invocation is `$skill-name` or
  the `/skills` command; implicit invocation is description-triggered
  ("progressive disclosure": names/descriptions load first, full body loads
  on selection). Instruction-only is the documented default; a skill needs a
  script only when the workflow cannot be expressed as instructions plus
  existing repository commands -- matching this phase doc's own bar exactly.
- **This is the same path AgentQuilt's `agentskills` adapter targets**
  (`packages/agentquilt-cli/src/core/adapters/agentskills.ts`, confirmed by
  reading the adapter source in this segment): the vendor-neutral
  `.agents/skills/<name>/SKILL.md` format (agentskills.io). Phase 4 flagged
  this exact path for Claude Code and found NO confirmed Claude Code
  discovery of it -- Claude Code skills live at `.claude/skills/` instead, a
  different location entirely. **For Codex, the finding is the opposite**:
  `.agents/skills/` is confirmed, current, first-class Codex-native skill
  discovery, not a coincidental overlap. This means AgentQuilt's
  `agentskills` target, if a consuming repository's product enabled it, would
  compile to the exact location Codex reads. This is noted as a fact for the
  Maintainer's awareness (decision D2) -- it does NOT change this phase's
  binding constraint against adding a Codex adapter to the compiler "solely
  for this SDLC," and it does NOT mean this design should route the
  pipeline's own skills through the `agentskills` adapter and compiler
  (`.agentquilt/skills/` is a product-facing mechanism for OTHER repositories'
  skills, not this repository's own development-pipeline skills; using it
  here would be exactly the kind of AgentQuilt product-feature entanglement
  ADR-0012 point 2 forbids for pipeline assets). The pipeline's skills are
  still hand-authored directly at `.agents/skills/` (native location, D2),
  simply noting explicitly -- as the master prompt asks -- that this native
  location happens to coincide with a path the compiler can also target for
  product use, and that coincidence is not exploited here.

### 2.4 `.codex/agents/*.toml` -- confirmed schema and project-trust gating

- Fetched documentation confirms the exact file layout the phase doc names:
  personal agents at `~/.codex/agents/*.toml`, project-scoped agents at
  `.codex/agents/*.toml` (one TOML file per agent). Required fields: `name`
  (source of truth for identity, independent of filename), `description`
  (used for delegation routing -- Codex decides when to spawn this agent much
  like Claude Code's `description` field), `developer_instructions` (the
  agent's system-level instructions). Optional fields inherit from the parent
  session when omitted: `model`, `model_reasoning_effort`, `sandbox_mode` (or,
  per this design's D1, the current permission-profile equivalent),
  `nickname_candidates` (readable labels when many instances of the same
  agent run at once), `mcp_servers.*`, `[[skills.config]]` entries.
- **Project trust is a hard precondition, confirmed against this
  repository's own `~/.codex/config.toml`**: "Project-scoped agent files only
  load when the project is trusted. Untrusted projects skip the `.codex/`
  layer entirely, preventing supply-chain injection of malicious agent
  definitions." This repository already has
  `[projects."/Users/sergeikochetkov/devel/agentquilt"] trust_level =
  "trusted"` recorded in `~/.codex/config.toml` (verified by reading the file
  directly in this segment, redacting nothing sensitive since the file
  contains no secrets in its plaintext body). This is a load-bearing,
  environment-specific fact: on a machine where this repository has not been
  marked trusted, none of this design's `.codex/agents/*.toml` files would
  load at all, silently. Section 9's validation plan and section 8 (non-
  goals) both flag this explicitly rather than assuming it away.
- **Delegation and nesting**: subagents are spawned when the parent session's
  prompt or "applicable project or skill instructions" request it -- this is
  the Codex-native analogue of Claude Code's Agent/Task tool `subagent_type`
  dispatch, but the mechanism is prompt-driven delegation recognized by the
  parent model reading `.codex/agents/*.toml` descriptions, not an explicit
  tool call with a fixed enum of agent names. `agents.max_depth` (default `1`)
  caps recursive delegation: a root session can spawn direct children, but
  those children cannot themselves spawn further descendants unless this is
  raised. This design relies only on depth-1 delegation (root session ->
  named custom agent), matching the Claude Code design's own "no dynamic
  workflow/agent-team construct" non-goal and the execution model's
  sequential-by-default rule.

### 2.5 `.codex/hooks.json` -- confirmed schema, scope, and necessity bar

- Fetched documentation confirms hooks load from `~/.codex/hooks.json`,
  `~/.codex/config.toml` (`[hooks]` inline table), `<repo>/.codex/hooks.json`,
  or `<repo>/.codex/config.toml` (`[hooks]` inline table) -- same trust gating
  as agents (section 2.4): project-local hooks load only when `.codex/` is
  trusted. Supported lifecycle events: `SessionStart`, `SubagentStart`,
  `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`,
  `PostCompact`, `UserPromptSubmit`, `SubagentStop`, `Stop`. `PreToolUse`
  matchers cover Bash, `apply_patch` (file edits), and MCP tool calls by name
  or regex; a `PreToolUse` hook denies a call by returning
  `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision":
  "deny", "permissionDecisionReason": "..."}}` (or exit code 2 with the
  reason on stderr).
- **Documented limitations, load-bearing for this design's guardrail
  choice**: only `type: "command"` hook handlers actually execute (`prompt`
  and `agent` handler types are parsed but skipped); "non-managed command
  hooks must be reviewed and trusted before they run"; interception is
  documented as incomplete for all shell call paths ("unified_exec" has
  limitations) and "`PreToolUse` cannot prevent equivalent work through
  alternate tool paths." This is a materially weaker guarantee than Claude
  Code's confirmed `permissions.deny` gitignore-style path matching (Phase 4
  section 8.2), which is a pure declarative rule with no script and no
  documented bypass path. Section 8 of this design addresses the
  consequence directly: this design does NOT add a `.codex/hooks.json` file
  in segment 2 unless the Maintainer decides otherwise at D6, because per-
  agent sandbox/permission scoping (section 2.2, section 2.4) already
  achieves this phase's guardrail goals natively, without an executable hook
  and without relying on a documented-incomplete interception surface -- this
  is the ADR-0012 point 7 necessity bar applied the same way Phase 4 applied
  it (native rule before hook), just landing on a different native mechanism
  (per-agent permission profile, not a settings deny-list, because Codex has
  no repository-wide declarative file-path deny list equivalent to Claude
  Code's `permissions.deny` -- confirmed absent from the fetched permission
  reference, which describes only sandbox/profile scoping, not path-pattern
  matching).

### 2.6 Nested `AGENTS.md` -- confirmed discovery and precedence, and why root `AGENTS.md` is the wrong target here

- Fetched documentation confirms: Codex reads (in order of precedence, later
  wins) `~/.codex/AGENTS.override.md` or `~/.codex/AGENTS.md` (global,
  highest priority checked first but conceptually the base layer), then walks
  from the Git root down to the current working directory, concatenating each
  level's `AGENTS.override.md` or `AGENTS.md` "with blank lines," where
  "files closer to your working directory override earlier guidance because
  they appear later in the combined prompt." Discovery stops at the current
  working directory -- it does not read deeper subdirectories than where the
  session is invoked.
- **This repository's root `AGENTS.md` is itself an AgentQuilt-generated
  file** (compiled from `.agentquilt/agents/project/` fragments, per
  CLAUDE.md's own generated-files policy and confirmed present at
  `/Users/sergeikochetkov/devel/agentquilt/AGENTS.md` in this segment). Codex
  already reads it today, with no action from this phase, exactly as any
  Codex session in this repository would. **This design does not propose
  hand-editing it** -- that would violate the generated-files policy
  regardless of which provider benefits.
- **No nested `AGENTS.md` currently exists anywhere in this repository**
  outside three golden-fixture test outputs under
  `packages/agentquilt-cli/tests/fixtures/golden/*/expected/AGENTS.md` (these
  are compiler test fixtures, not real instruction files, and out of scope).
  A nested `AGENTS.md` -- for example at `.codex/AGENTS.md` or at a
  subdirectory scoped to a specific concern -- is the correct native
  mechanism IF Codex needs instructions that differ from what the root
  `AGENTS.md` already says, per the master prompt's explicit instruction to
  investigate this distinction. **This design's finding: no nested
  `AGENTS.md` is needed for segment 2.** The root `AGENTS.md`'s content
  (compiled from the `project/` fragments -- repository overview, development
  commands, key design principles) is already provider-neutral instruction
  content equally valid for a Codex session as for a Claude Code session; it
  says nothing Claude-Code-specific that would need a Codex override. The
  Codex-specific material this phase produces (custom agent definitions,
  skills, sandbox/permission choices) lives entirely in `.codex/agents/*.toml`,
  `.codex/config.toml`, and `.agents/skills/*/SKILL.md` -- locations Codex
  reads independently of `AGENTS.md` -- so there is no gap a nested
  `AGENTS.md` would need to fill. If a genuine Codex-only instruction need
  surfaces later (for example, a Codex-specific caution that would be noise
  in a Claude Code session), the correct fix is a small nested `.codex/
  AGENTS.md` at that time, not an edit to the generated root file. Flagged as
  decision D3 rather than silently deciding it.

### 2.7 `codex exec` / `codex review` and the "native non-interactive execution only for explicit evaluations" constraint

- `codex exec` (alias `e`) runs Codex non-interactively with a prompt argument
  or stdin, honoring the same `-s/--sandbox` and `-c` overrides as the
  interactive CLI, plus `exec resume`/`exec review`. `codex review` runs a
  non-interactive code review against `--uncommitted`, `--base <branch>`, or
  `--commit <sha>`. Both are real, confirmed, installed commands (section
  2.1) -- not a hypothetical.
- Per the master prompt constraint, this design treats every non-interactive
  invocation named in section 4 and section 6 as a human-run evaluation
  command the Maintainer types manually in a terminal, never as a step this
  phase or any future CI workflow runs automatically. No `.github/workflows/
  *.yml` file is touched by this phase (out of scope, matching Phase 4's own
  boundary), and no invocation in this document's file layout or examples is
  wired into a script this repository executes automatically.

### 2.8 CONTRIBUTING.md, README.md, `.github/workflows/*.yml`

- Consistent with the lifecycle contracts; no changes needed for this phase,
  matching Phase 4's own finding for the same files. Not touched.

## 3. Design principle: Codex's own primitives, not a Claude Code mirror

Codex's native building blocks are project-scoped custom agents (`.codex/
agents/*.toml`, each carrying its own sandbox/permission scope, model, and
instructions as a first-class file) and skills (`.agents/skills/*/SKILL.md`,
description-triggered or explicitly invoked). There is no Codex analogue of
Claude Code's separate "command" concept (`.claude/commands/*.md`, user-
invoked only, no auto-trigger) -- Codex skills already cover both invocation
styles (implicit via description match, explicit via `$skill-name`) through
`agents/openai.yaml`'s `policy.allow_implicit_invocation` flag, which is a
per-skill boolean rather than a separate file-type. Forcing Phase 4's 6-skill/
2-command split onto Codex would manufacture a distinction Codex's own schema
does not need: this design uses exactly one shape -- **skills** -- for all 8
required workflows, and expresses the "should this ever auto-trigger"
question that motivated Claude Code's skill/command split as the per-skill
`allow_implicit_invocation` policy flag instead (section 6, decision D4).

The other structural difference from Claude Code: Claude Code enforces read-
only vs. write-capable per agent through the `tools:` frontmatter list (an
allow-list of tool names) with permission MODE as a secondary signal. Codex
enforces it through the permission-profile system directly (`default_
permissions` / `sandbox_mode` per custom agent, section 2.2, section 2.4) --
this is a stronger, more structural guarantee for the "at minimum" required
custom agents (section 4) than an instruction-body restriction, because a
read-only Codex agent's shell/file-write tool calls are rejected by the
sandbox itself, not merely discouraged in the prompt. This satisfies the
phase doc's "use provider-native sandbox settings to distinguish read-only
and write-capable roles" requirement more directly than Claude Code's own
Phase 4 design could for its four Bash-granted read-only roles (Phase 4's own
flagged D5 residual risk, section 8 of that document) -- a genuine Codex-side
strength worth naming plainly rather than downplaying.

## 4. Required custom agents -- design and agent-portfolio.md mapping

Every custom agent file (segment 2) is self-contained: `name`, a trigger-
bearing `description` (Codex uses this for delegation routing, matching how
Claude Code's own `description` field routes the Agent tool), `developer_
instructions` restating the role contract's purpose, triggers, authority
boundaries, and prohibitions (per [agent-portfolio.md section 6](agent-portfolio.md#6-role-contracts),
never inventing new authority), and a permission-profile assignment enforcing
read-only vs. workspace-write at the sandbox layer, not just in prose.

| # | Required agent (phase doc) | `.codex/agents/*.toml` name | Maps to (agent-portfolio.md) | Permission profile |
| - | --------------------------- | ---------------------------- | ----------------------------- | ------------------- |
| 1 | read-only repository explorer | `repository-explorer` | [6.1 repository-analyst](agent-portfolio.md#61-repository-analyst-core) (INV) | `:read-only` |
| 2 | read-only implementation planner | `implementation-planner` | [6.2 implementation-planner](agent-portfolio.md#62-implementation-planner-core) (CLS, PLN) | `:read-only` |
| 3 | workspace-write implementer | `feature-implementer` | [6.3 feature-implementer](agent-portfolio.md#63-feature-implementer-core) (IMP, COR fixes, PRP assembly) | `:workspace` |
| 4 | read-only test reviewer | `test-reviewer` | [6.4 test-engineer](agent-portfolio.md#64-test-engineer-core), VER/VAL read-only review half only (see note below) | `:read-only` |
| 5 | read-only architecture reviewer | `architecture-reviewer` | [6.5 architecture-reviewer](agent-portfolio.md#65-architecture-reviewer-core) (REV) | `:read-only` |
| 6 | read-only regression reviewer | `regression-reviewer` | [6.6 regression-reviewer](agent-portfolio.md#66-regression-reviewer-core) (RGR) | `:read-only` (see note below on deterministic-check execution) |
| 7 | read-only documentation reviewer | `documentation-reviewer` | [6.7 documentation-reviewer](agent-portfolio.md#67-documentation-reviewer-core) (DOC) | `:read-only` |
| 8 | read-only release reviewer | `release-reviewer` | [6.8 release-reviewer](agent-portfolio.md#68-release-reviewer-core) (REL) | `:read-only` |

Two notes on faithful mapping, named explicitly rather than glossed over:

- **"read-only test reviewer" (phase doc, item 4) is a role that does not
  exist as a standalone entity in agent-portfolio.md.** The portfolio's
  `test-engineer` (6.4) is `permissions: workspace` (it writes test code and
  fixtures, and executes commands) because it owns VER and VAL, not just
  review. The phase doc's minimum list asks for a strictly READ-ONLY test
  reviewer, which is a narrower slice: reading test results and coverage to
  form a verification-adequacy opinion, without writing or executing tests
  itself. This design's `test-reviewer` custom agent is scoped to exactly
  that slice -- it reads the Return Handoff's focused-verification section
  and existing test files to assess adequacy (a component of
  architecture-reviewer's REV checklist item "test adequacy for changed
  code," [review-contract section 3](review-contract.md#3-review-types-and-their-required-checks))
  and never itself runs `npm test`. Actually EXECUTING focused/full
  verification remains the write-capable `test-engineer` role's job, done
  through the `feature-implementer`'s workspace-write custom agent (which
  runs the authoritative commands as part of IMP/VER, matching how Phase 4's
  `implement-task` skill delegates VER to `test-engineer`) -- this design
  does not create a second write-capable custom agent for test execution,
  to avoid two agents both claiming write access for overlapping reasons.
  This is decision D5: whether to also add a workspace-write `test-runner`
  custom agent purely for VER/VAL command execution (mirroring the
  portfolio's `test-engineer` more completely) or to keep verification
  execution inside `feature-implementer`'s scope as this design proposes.
  Recommendation in section 9.
- **`regression-reviewer` and (implicitly, per the phase doc's minimum-8 list
  not separately mentioning it) the deterministic-output specialist both
  need to EXECUTE deterministic checks (`npx agentquilt check`, `npm test`)
  while remaining otherwise read-only** -- exactly the same tension
  agent-portfolio.md's own D2 (section 10) already named and left as a
  documented risk for Phase 6 in the Claude Code design (Phase 4 section
  4.5's "regression-reviewer... may additionally execute deterministic
  checks"). Codex's permission-profile system gives this design a real
  answer Claude Code's Phase 4 could not fully give: a custom **profile**
  (not just the built-in `:read-only`) can allow specific commands while
  denying file writes. This design proposes a custom `[permissions.
  read-only-with-checks]` profile (section 6, decision D6) that extends
  `:read-only` but allows the specific authoritative check commands
  ([validation-evidence section 3](validation-evidence.md#3-authoritative-commands):
  `npm test`, `npx agentquilt check`) to execute without granting general
  write access -- genuinely narrower than Claude Code's Phase 4 D5 residual
  risk (a broad `Bash` grant restricted only by instruction-body text). This
  is a concrete Codex-side improvement over the Claude Code design worth
  flagging plainly, not just a duplicated pattern.

## 5. Required skills -- design and workflow mapping

All 8 skills are instruction-only (section 2.3 confirms this is both the
documented default and matches this phase doc's stated preference). Each
`SKILL.md` states, self-contained: purpose, triggering description (used for
both the implicit-match text and, verbatim, as the frontmatter `description`),
which named Phase 4-table custom agent(s) it delegates to (never inventing a
new one -- section 4's 8 are the complete Codex-side roster, each already
mapped to its agent-portfolio.md contract), the artifact format it produces
(by anchor into the Phase 2 contracts, never restated per handoff-contract
rule 2), and the prohibited actions from the common contract.

| # | Required skill (phase doc) | `.agents/skills/<name>/SKILL.md` | Stage(s) | Delegates to (section 4 agents) | `allow_implicit_invocation` |
| - | --------------------------- | ---------------------------------- | -------- | -------------------------------- | ----------------------------- |
| 1 | issue analysis | `analyze-issue` | CLS + INV | `implementation-planner`, `repository-explorer` (parallel for high-risk) | true |
| 2 | change planning | `plan-change` | PLN + APP trigger | `implementation-planner` | true |
| 3 | standard development loop | `standard-development` | full CLS-to-PRP loop (section 7) | all 8 (composite) | true |
| 4 | bounded implementation | `implement-task` | IMP + VER, reused for COR | `feature-implementer` | true |
| 5 | working-tree review | `review-tree` | REV (+ specialist fan-out) | `architecture-reviewer`, `test-reviewer`, plus the 6 specialist roles by name (section 5.1) | true |
| 6 | CI diagnosis | `fix-ci` | ad hoc red-check correction | `repository-explorer` (if unclear), `feature-implementer` | true |
| 7 | PR preparation | `prepare-pr` | PRP | `feature-implementer` (assembly only) | **false** (D4) |
| 8 | release-readiness assessment | `release-readiness` | REL | `release-reviewer` | **false** (D4) |

### 5.1 Specialist routing inside `review-tree`

`review-tree` fans out, per [agent-portfolio.md section 5.2](agent-portfolio.md#52-by-task-type-typical-classification-and-specialist-routing),
to whichever of the 6 conditional specialists the touched areas require:
`security-review`, `schema-design`, `deterministic-output`, `eval-designer`,
`supply-chain-risk`, `ambiguity-detector`. These 6 specialists are NOT
separately listed in the phase doc's "at minimum" 8-agent list (which names
only the 8 core-lifecycle-role agents of section 4) -- consistent with how
Phase 4 treated them as review-time fan-out rather than top-level workflow
entry points. This design does not create 6 additional `.codex/agents/*.toml`
files for them in segment 1; whether to create them now or defer is decision
D7 (section 9). If created, each would be `:read-only`, named identically to
its existing `.agentquilt/agents/<name>/` directory (matching agent-
portfolio.md's own D5 naming-continuity choice), and invoked the same way as
the 8 core agents -- the mapping is direct and requires no new design
judgment beyond "create the file," which is why it is deferred to segment 2
rather than elaborated here.

### 5.2 Workflow designs (brief; full detail parallels Phase 4 section 4, not repeated)

- **`analyze-issue`**: (1) delegate to `implementation-planner` for a Task
  Classification ([format](task-classification.md#3-artifact-format-task-classification));
  (2) if acceptance criteria are unfalsifiable, note the `ambiguity-detector`
  specialist as a review-time fallback (Codex has no separate top-level
  ambiguity-detector agent per section 5.1 -- this is a design note, not a
  gap: the planner's own instructions include the ambiguity checklist
  inline, since CLS is the stage where ambiguity is cheapest to catch and
  waiting for REV would be a regression from Phase 4's design); (3) delegate
  to `repository-explorer` for the Repository Investigation
  ([format](investigation-contract.md#4-artifact-format-repository-investigation)),
  parallel instances for high-risk disjoint questions (section 7,
  Parallelism).
- **`plan-change`**: delegate to `implementation-planner` for the
  Implementation Plan ([format](implementation-plan-contract.md#4-artifact-format-implementation-plan));
  flag every trigger; stop and state plainly it is pausing for the
  Maintainer's recorded decision when any trigger or high-risk profile is
  present -- identical gate behavior to Phase 4's `plan-change`, expressed
  through Codex's own turn-taking (a skill's instructions can direct the
  session to stop and wait exactly as a Claude Code skill's instructions do;
  neither provider has a structural "pause" primitive beyond the model
  choosing not to proceed, so this remains a prompted behavior in both
  designs, not a mechanism difference worth a decision point).
- **`standard-development`**: the full 10-step loop (section 7).
- **`implement-task`**: delegate to `feature-implementer` (`:workspace`) with
  the Implementation Handoff verbatim; run the task's focused verification as
  part of the same agent's turn (the authoritative commands, including `npx
  agentquilt check` whenever fragments/manifests/config/generated files were
  touched); assemble the Return Handoff. Reused for COR identically to Phase
  4's `implement-task`.
- **`review-tree`**: delegate to `architecture-reviewer` and `test-reviewer`
  (parallel, both read-only, non-overlapping); fan out to specialists per
  5.1; merge into one Review Findings artifact.
- **`fix-ci`**: read the failing command's exact output; delegate to
  `repository-explorer` if the cause is unclear; delegate the fix to
  `feature-implementer`; re-run the authoritative command; reclassify via
  `plan-change` if the fix touches a previously unflagged trigger. Distinct
  from `standard-development`'s own COR step exactly as Phase 4's `fix-ci`
  is distinct from `develop-issue`'s step 8 (different entry evidence: a
  failing command vs. a Review Findings artifact).
- **`prepare-pr`** (`allow_implicit_invocation: false`, D4): gather this
  session's Task Classification, Implementation Plan + approval reference,
  Review Findings + resolutions, Validation Evidence; delegate to
  `feature-implementer` to assemble the PR Summary
  ([format](completion-contract.md#3-artifact-format-pr-summary)); print it.
  Never runs `git push` or `gh pr create` -- same absolute-rule boundary as
  Phase 4's `/prepare-pr` command.
- **`release-readiness`** (`allow_implicit_invocation: false`, D4): delegate
  to `release-reviewer` for the Release-Readiness Summary
  ([format](completion-contract.md#4-artifact-format-release-readiness-summary));
  print the verdict. Never bumps, tags, or publishes.

## 6. Guardrails: sandbox and permission design (native enforcement, not instruction text)

### 6.1 Principle: per-agent permission profile before hook

Mirroring [ADR-0012 point 7](../architecture/adr/ADR-0012-provider-native-agentic-sdlc-boundary.md)
and Phase 4's own section 8.1 "native rule before hook" principle, this
design's primary enforcement mechanism is the permission-profile assignment
on each `.codex/agents/*.toml` file (section 4), not a `.codex/hooks.json`
script. Unlike Claude Code, Codex has no repository-wide declarative path-
pattern deny list equivalent to `permissions.deny` (confirmed absent from the
fetched permission reference, section 2.2) -- so the two designs' guardrail
SHAPE differs even though the underlying policy (read-only roles cannot
write; generated files and absolute-rule commands are never touched by an
agent) is identical. Codex's per-agent sandbox scoping happens to be the
better-fitting native primitive for restricting the 8 required agents
themselves; it does nothing to stop the human's own interactive session (main
Codex thread, not a spawned custom agent) from attempting a generated-file
edit, which is where a `.codex/hooks.json` PreToolUse rule would add value if
added at all (decision D6).

### 6.2 Proposed `.codex/config.toml` additions (segment 2, not built this segment)

```toml
# Codex-native custom-agent registry is file-based (.codex/agents/*.toml);
# this file carries only the project-level default permission profile and
# the custom "read-only-with-checks" profile section 4 relies on.

default_permissions = ":read-only"

[permissions.read-only-with-checks]
extends = ":read-only"
# Allows the authoritative deterministic check commands
# (validation-evidence.md section 3) to execute without granting general
# write access. Exact allow-list syntax confirmed empirically in segment 2
# against the installed 0.144.x permission-profile schema (see decision D6
# and section 10's validation-plan item).
```

The project-level `default_permissions = ":read-only"` sets the SESSION
default (the main interactive Codex thread a Maintainer starts manually) to
read-only, matching this repository's overall bias toward review before
write; a Maintainer doing hands-on implementation work overrides per-session
with `-s workspace-write` or `--profile <name>` exactly as today, unaffected
by this file. Each custom agent's own TOML (section 4) sets its OWN profile,
which is what actually enforces the read-only/workspace-write split for the
8 required agents regardless of the project default.

### 6.3 What is deliberately left alone

- No `.codex/hooks.json` is added in segment 2 by this design's
  recommendation (decision D6) -- the permission-profile assignment already
  covers this phase's guardrail goals for every spawned custom agent, and
  the documented `PreToolUse` interception gaps (section 2.5) mean a hook
  would add a false sense of completeness for a goal the sandbox already
  covers more reliably. If the Maintainer wants an explicit guard against
  the MAIN interactive session (not a spawned agent) attempting a generated-
  file edit or an absolute-rule command (`git push`, `npm publish`, etc.),
  that is the one case in this design where a hook script would be
  justified under the ADR-0012 point 7 bar -- flagged as the D6 alternative,
  not built by default.
- Destructive-but-sometimes-legitimate git operations (`rm -rf`, `git reset
  --hard`, `git clean -f`, `git branch -D`, history rewrites) are not
  targeted by any new rule. Codex's approval-policy/permission system already
  requires interactive confirmation for anything outside a session's granted
  profile; this design adds no new allow entries that would bypass that
  default, mirroring Phase 4 section 8.3's identical reasoning.

## 7. The `standard-development` skill's 10-step loop, mapped to lifecycle stages

Direct Codex-native counterpart to Phase 4's 13-step `develop-issue` loop,
implementing the identical Phase 2 lifecycle stages via Codex delegation
instead of the Claude Code Agent tool's `subagent_type` dispatch. The step
numbering below is the phase doc's own required list (10 steps); the table
maps it onto the same CLS..PRP stage codes Phase 4 used, so this is
demonstrably one policy expressed through two providers' native mechanisms.

| Step (phase doc) | Stage(s) | Handled by | Codex agent(s) delegated to |
| ----------------- | -------- | ---------- | ----------------------------- |
| 1. classify | CLS | inline (this skill's own first action, or delegates to `analyze-issue` skill) | `implementation-planner` |
| 2. delegate exploration | INV | `analyze-issue` skill (referenced) | `repository-explorer` (parallel for high-risk) |
| 3. synthesize plan | PLN | `plan-change` skill (referenced) | `implementation-planner` |
| 4. request approval where required | APP | `plan-change` skill's own stop behavior | Maintainer |
| 5. delegate implementation | IMP | `implement-task` skill (referenced), looped per bounded task, strictly sequential | `feature-implementer` |
| 6. run focused validation | VER | inside `implement-task`'s own turn | `feature-implementer` (executes; `test-reviewer` may be consulted for adequacy, not execution) |
| 7. delegate independent reviews | REV (+ RGR, DOC as directly-handled sub-steps, matching Phase 4's own choice not to give RGR/DOC separate top-level workflows) | `review-tree` skill (referenced) | `architecture-reviewer`, `test-reviewer`, `regression-reviewer`, `documentation-reviewer`, specialists per 5.1 |
| 8. perform corrective iteration | COR | `implement-task` reused for the fix; original reviewer re-checks | `feature-implementer` + the same reviewing agent that raised the finding |
| 9. run broad validation | VAL | inline (this skill's own step, delegates execution to `feature-implementer`'s workspace-write profile since VAL requires running the full authoritative command set) | `feature-implementer` |
| 10. prepare PR evidence | PRP | `prepare-pr` skill (referenced) | `feature-implementer` (assembly) |

Rules restated here because they are the loop's own non-negotiables (per the
phase doc, not new invention -- identical to Phase 4's own restated rules):

- Independent review (step 7) is mandatory in the standard and high-risk
  profile even if every prior step went smoothly; the small profile still
  performs the diff-review form of step 7.
- Step 5's implementation loop is strictly sequential -- no two
  `feature-implementer` delegations run concurrently in the same working
  tree. This is enforced the same way Phase 4 enforced it: by the skill's own
  instructions and `agents.max_depth` (section 2.4) rather than a hard
  scheduler, since neither provider has a runtime that could enforce it
  structurally without becoming exactly the orchestrator ADR-0012 forbids.
- If step 7 or a later stage discovers a trigger the plan did not flag,
  `standard-development` stops and re-enters `plan-change` for
  reclassification before continuing.
- If step 9's full validation surfaces a failing deterministic check rather
  than a design/scope problem, `standard-development` delegates to `fix-ci`
  rather than re-deriving the same diagnose-fix-verify procedure inline.

### 7.1 Where Codex's loop and Claude Code's loop diverge in MECHANISM (not policy)

Named explicitly per the task instructions, since the two loops implement the
identical Phase 2 policy:

- **Delegation trigger.** Claude Code's Agent tool takes an explicit
  `subagent_type` parameter naming one of the 14 compiled agents; the calling
  skill's instructions literally state which named agent to invoke, and the
  harness enforces that only that named definition runs. Codex's custom-agent
  delegation is prompt-recognized: the parent session's model reads the
  `description` fields of the `.codex/agents/*.toml` files present and
  decides to spawn one when its own instructions or the user's request
  match -- there is no separate tool-call parameter with a closed enum
  the way Claude Code's `subagent_type` is (implicitly) constrained to the
  known agent list. This design compensates by having each Codex skill's
  instructions name the target custom agent explicitly and by keeping the
  8-agent (plus optional 6-specialist) roster small and unambiguous, but the
  underlying guarantee that "the model cannot invent a 15th agent" is weaker
  in Codex than the closed-enum-like behavior Claude Code's tool schema
  gives Phase 4. This is a real, disclosed difference, not treated as
  equivalent to Claude Code's mechanism just because the intent is the same.
- **10 steps vs. 13 steps -- not a policy gap.** Phase 4's `develop-issue` had
  13 numbered steps because it additionally spelled out RGR, DOC, and VAL as
  separate rows in its own table (its own choice, beyond the phase-4 doc's
  required list, which itself was unnumbered prose). This phase's phase doc
  gives Codex a literal 10-item numbered list that already folds RGR/DOC into
  step 7 ("delegate independent reviews") and VAL into step 9 ("run broad
  validation") explicitly. This design follows the Codex phase doc's own
  numbering verbatim (table above) rather than inventing extra top-level
  steps to match Phase 4's count -- the STAGE coverage is identical (every
  CLS..PRP stage is handled by exactly one step or sub-step in both designs),
  only the enumeration granularity differs, driven by each phase doc's own
  wording.
- **Read-only enforcement.** Claude Code enforces read-only via the `tools:`
  frontmatter allow-list (a tool-name allow-list) with `permissions.deny`
  path rules as an orthogonal, repository-wide backstop (Phase 4 section 8).
  Codex enforces it via the sandbox/permission-profile assignment on each
  custom agent file directly (section 4, section 6) -- no separate repository-
  wide deny-list exists to layer on top, so this design relies more heavily
  on the per-agent profile being correct than Phase 4's design needed to,
  since there is no equivalent second line of defense against, say, a
  Maintainer's own interactive session accidentally editing a generated file
  (section 6.3's D6 hook alternative is the closest Codex-native analogue,
  left as an option rather than built by default).
- **Skill/command split vs. one shape.** Already covered in section 3 -- Phase
  4 uses two file types (skills, commands); this design uses one (skills)
  with a per-skill implicit-invocation flag, because that is what Codex's own
  schema offers.
- **Non-interactive evaluation commands.** Codex's `codex exec`/`codex
  review` give this design a genuine non-interactive path for representative-
  workflow evaluation (section 2.7) that Claude Code's Phase 4 design did not
  have an equivalent for (Claude Code's Phase 4 validation plan relied
  entirely on live interactive sessions, per its own section 10 and its
  report's disclosed "live interactive validation was not run" limitation).
  This design's validation plan (section 10) can therefore go further for
  Codex than Phase 4 could for Claude Code, using `codex exec` for the
  small-profile representative-workflow check -- still a human-run evaluation
  command, never a CI step, per the master prompt constraint.

## 8. Parallelism

Identical policy to Phase 4 section 5, expressed through Codex's depth-1
delegation model (section 2.4):

- `analyze-issue` may spawn multiple `repository-explorer` instances in one
  batch when the profile is high-risk and the investigation has genuinely
  disjoint questions; `plan-change`'s `implementation-planner` merges their
  artifacts.
- `review-tree`'s specialist fan-out is parallel read-only work by
  design -- none of the specialist roles (section 5.1) write.
- `agents.max_depth` (default `1`, section 2.4) already prevents a spawned
  custom agent from spawning further descendants without a config change this
  design does not propose making -- this is a stronger structural guarantee
  against runaway recursive delegation than Phase 4's design needed to state,
  since Claude Code has no equivalent documented depth cap and relied
  entirely on instruction-text discipline for the same "no dynamic
  workflow/agent-team construct" non-goal.
- Nothing in this design uses worktree isolation; that remains reserved for
  Phase 9, unchanged from Phase 4's own note.

## 9. What is NOT built (explicit non-goals)

- No Claude Code assets are touched (Phase 4's `.claude/skills/`,
  `.claude/commands/`, `.claude/settings.json` are unaffected; this document
  does not modify them).
- No AgentQuilt compiler change and no Codex adapter (`agentskills`,
  `codex`, or otherwise) added for this SDLC effort, per the phase doc's
  explicit prohibition and CLAUDE.md's own DEFERRED-section framing of a
  hypothetical future Codex adapter as out of scope for the PRODUCT -- this
  design's `.codex/` and `.agents/skills/` files are hand-authored and
  unmanaged by AgentQuilt, exactly as Phase 4's `.claude/skills/` files are
  unmanaged (D2 there; the same choice here, section 5).
- No change to any of the 14 `.agentquilt/agents/<name>/` sources or their
  compiled `.claude/agents/*.md` outputs. Both this design and Phase 4's
  route to the SAME 14-agent role contracts; neither renames or re-scopes a
  Phase 3 role.
- No hand-edit of root `AGENTS.md` and no new nested `AGENTS.md` file
  (section 2.6's finding: not needed for segment 2).
- No `.codex/hooks.json` by default (section 6.3, decision D6's recommended
  path).
- No change to `.github/workflows/*.yml` (Phase 7 scope, matching Phase 4's
  own boundary).
- No live model calls in any deterministic path; every `codex exec`/`codex
  review` reference in this document is named as a human-run evaluation
  command (section 2.7), never a CI step.
- No git push, PR creation, publish, or any remote/telemetry-sending Codex
  command was run by this segment's investigation -- every command in section
  10 ("Commands run") below is local-only (`--version`, `doctor`, `--help`,
  reading local files, and read-only `WebFetch`/`WebSearch` against public
  documentation).

## 10. Validation plan (segment 2, after approval and build)

Mapped to the phase doc's own "Validate:" bullets, noting explicitly which
checks this design can run non-interactively (section 2.7's genuine Codex
advantage over Phase 4's Claude Code design) versus which remain a live,
human-supervised session -- consistent with ADR-0012 point 4 (no live model
calls in CI, this table included):

| Phase doc validation bullet | How segment 2 checks it |
| ---------------------------- | ------------------------ |
| instruction discovery from `AGENTS.md` | Already true (root `AGENTS.md` exists, section 2.6); unaffected by this phase. Confirm via `codex exec "state the first sentence of your project instructions"` (non-interactive, human-run) that the compiled root `AGENTS.md` content is visible to a session in this repository. |
| custom agent discovery | After segment 2 creates the `.codex/agents/*.toml` files: `codex exec "list the custom agents available to you in this project"` (non-interactive, human-run) and confirm all 8 (or 14, per D7) names appear, given this repository's confirmed trusted status (section 2.4). |
| skill discovery | Same technique for `.agents/skills/*/SKILL.md`; confirm all 8 skill names and descriptions are visible. |
| read-only sandbox behavior | Attempt (in a disposable branch or scratch file) to have a `:read-only`-profile custom agent (for example `repository-explorer`) write a file; confirm the sandbox rejects it structurally, not just that the agent declines in prose. |
| workspace-write implementer behavior | Confirm `feature-implementer`'s `:workspace` profile permits an edit inside the repository working tree and confirm it is still rejected for actions outside that scope (for example a push, section 6.3). |
| subagent delegation | Invoke `standard-development` on a representative small task and confirm, from the transcript, that it actually spawned the named custom agents at each step rather than performing the work itself in the root session. |
| approval boundaries | Run a standard-profile task with a deliberately flagged trigger through `standard-development`; confirm it stops at `plan-change`'s gate before any `feature-implementer` delegation, matching the identical Phase 4 validation bullet. |
| representative small and medium workflows | Small: `analyze-issue` (light) -> `implement-task` -> focused check -> `review-tree` diff review -> `prepare-pr`. Medium (standard profile with a flagged trigger): full `standard-development` 10-step loop, confirming the correct human gate and the RGR/DOC/VAL coverage inside step 7/step 9. |

All of the above are Maintainer-run, non-interactive-where-possible (`codex
exec`) or interactive commands in this repository, never a CI step -- this
segment (investigation and design only) did not run any of them; they are
segment 2's job after the Maintainer approves this design.

## 11. Acceptance-criteria mapping

| Phase doc acceptance criterion | This design's answer |
| -------------------------------- | ---------------------- |
| Codex can execute the complete standard lifecycle without an SDK | `standard-development` (section 7) is that one entry point; no SDK, API integration, or custom runtime is introduced anywhere in this design -- only `.codex/agents/*.toml`, `.codex/config.toml`, and `.agents/skills/*/SKILL.md`, all native Codex file formats read by the installed CLI directly |
| Codex configuration is independently understandable | This document plus each `.codex/agents/*.toml` and `SKILL.md` file's own self-contained `description`/`developer_instructions`, mirroring Phase 4's identical claim for its own files |
| No AgentQuilt compiler feature was introduced | Confirmed: no `packages/agentquilt-cli/src/` change proposed anywhere in this design; section 2.3's `.agents/skills/` coincidence with the `agentskills` adapter is explicitly NOT exploited (D2) |
| Provider-specific duplication is documented where intentional | Section 7.1 names every point of mechanism divergence from Phase 4's Claude Code design and why; section 3's "one shape, not two" is itself a documented, intentional non-mirroring choice |
| Product behavior is unchanged | This design touches no product code, no CI workflow, and no released package surface |

## 12. Decision points for the Maintainer (gate)

This segment stops here, before any file under `.codex/` or `.agents/skills/`
is created or modified. Approving the recommended option on every point below
approves exactly the design in sections 3-8; segment 2 executes it verbatim
plus the empirical syntax checks named as prerequisites.

- **D1 -- Permission system choice (section 2.2, section 6).** Use the
  current `default_permissions`/`[permissions.<profile>]` system exclusively,
  never the legacy `sandbox_mode`/`approval_policy` pair. Recommendation:
  approve as specified -- the fetched documentation states the two systems
  "do not compose," the legacy pair is explicitly documented as not
  overridable at the project-scoped layer (making it unusable for this
  design's per-agent, project-scoped goal regardless of preference), and the
  current system is what the fetched subagent schema's own worked examples
  assume for new custom-agent files. Alternative: none credible, given the
  project-scoped-override limitation is a hard technical blocker for the
  legacy pair, not a style preference.
- **D2 -- `.agents/skills/` and the AgentQuilt adapter coincidence (section
  2.3, section 9).** Hand-author this phase's 8 skills directly at
  `.agents/skills/<name>/SKILL.md`, unmanaged by AgentQuilt, explicitly
  choosing NOT to route them through the `agentskills` compiler adapter even
  though that adapter targets the exact same path Codex reads. Recommendation:
  approve as specified -- routing pipeline-only development skills through a
  product adapter would blur the ADR-0012 product/pipeline boundary point 2
  ("no `agentquilt` command runs, scores, or coordinates development
  agents"; using the compiler to manage the pipeline's OWN skill sources
  crosses from "dogfooding for agent definitions" -- already permitted and
  already done for `.claude/agents/` -- into "the product gains pipeline
  features," which is different and not permitted) for a benefit (compiler-
  verified drift checking of skill sources) this design does not need, since
  8 hand-authored files are easily kept in sync by review alone. Alternative
  (not recommended): compile pipeline skills through `.agentquilt/skills/`
  for portfolio-authoring consistency with how `.agentquilt/agents/` sources
  the 14 dev agents -- rejected because the analogy is imperfect: `.claude/
  agents/*.md` is a Claude-Code-only, non-product-adjacent output path,
  while `.agents/skills/` is the SAME path a real product feature
  (`agentskills` target) could compile to for OTHER repositories, so reusing
  it here risks exactly the confusion ADR-0012 is trying to prevent, not just
  a style question.
- **D3 -- Nested `AGENTS.md` (section 2.6).** No nested `AGENTS.md` file is
  created; root `AGENTS.md` (already Codex-readable, already generated by
  AgentQuilt from the `project/` fragments) is left untouched and is judged
  sufficient because it contains no Claude-Code-specific content that would
  need a Codex-side override. Recommendation: approve as specified.
  Alternative: pre-emptively add a `.codex/AGENTS.md` stub now, even with no
  content need identified -- not recommended, since an empty or near-empty
  file adds a maintenance surface with no present benefit and the master
  prompt's own instruction was to investigate the distinction and flag it,
  not to build one speculatively.
- **D4 -- Implicit-invocation policy for `prepare-pr` and `release-
  readiness` (section 5, section 5.2).** Set `allow_implicit_invocation:
  false` in each skill's `agents/openai.yaml` so both only start on
  deliberate explicit invocation (`$prepare-pr`, `$release-readiness`),
  mirroring Phase 4's D1/D7 reasoning that these two workflows are adjacent
  to the "no agent pushes/publishes" absolute rule and should never be
  ambient. Recommendation: approve as specified. Alternative: leave both
  implicitly invokable like the other 6 skills, accepting the small
  additional risk that a session might auto-trigger a PR-summary assembly
  mid-conversation -- not recommended for the same reason Phase 4 rejected
  the equivalent risk for its two commands.
- **D5 -- Whether to add a second, workspace-write `test-runner` custom
  agent purely for VER/VAL command execution (section 4, first note).**
  This design's default keeps verification EXECUTION inside
  `feature-implementer`'s `:workspace` scope (matching how Phase 4's
  `implement-task` skill delegates VER to `test-engineer`, a distinct write-
  capable role there) and gives Codex's `test-reviewer` custom agent a
  narrower, read-only ADEQUACY-review-only scope that does not exist as a
  separate role in agent-portfolio.md. Recommendation: approve the narrower
  read-only `test-reviewer` as specified, since it satisfies the phase doc's
  literal "read-only test reviewer" requirement precisely and avoids adding
  a 9th custom agent this segment when `feature-implementer` already covers
  test EXECUTION. Alternative: add a dedicated `test-runner` custom agent
  with its own `:workspace`-scoped-to-test-paths-only profile (closer
  structural parity to agent-portfolio.md's `test-engineer`, which is
  explicitly write-capable for test code and fixtures) -- a genuine
  either-way choice; the alternative's benefit is narrowing
  `feature-implementer`'s own write scope further (it would no longer need
  to run test commands itself), at the cost of a 9th agent file and a
  more complex handoff between two write-capable roles for one bounded task.
- **D6 -- Whether to add `.codex/hooks.json` at all this phase (section 6.1,
  section 6.3).** Recommendation: do not add one in segment 2; rely
  exclusively on per-agent permission-profile scoping (section 4, section
  6.2), which this design judges sufficient for the phase doc's guardrail
  goals and avoids relying on the documented-incomplete `PreToolUse`
  interception surface (section 2.5) for a guarantee the sandbox already
  gives more reliably. Alternative: add a `PreToolUse` hook denying `Bash`
  matches against `git push`, `git tag`, `npm publish`, `npm version`, `gh pr
  merge`, `gh release` (the same absolute-rule command set Phase 4's
  `permissions.deny` covers) as a backstop against the MAIN interactive
  session, not just spawned agents -- the one case section 6.3 named as
  potentially justified under the ADR-0012 point 7 bar, since Codex has no
  declarative equivalent to Claude Code's repository-wide `permissions.deny`
  for this. If the Maintainer wants guardrail parity with Phase 4's covered
  absolute-rule set for the MAIN session (not just spawned custom agents),
  this alternative should be chosen instead.
- **D7 -- Whether to also create `.codex/agents/*.toml` files for the 6
  conditional specialists now (section 5.1) or defer them to when
  `review-tree`'s fan-out first needs one.** Recommendation: defer to
  segment 2's own judgment at build time -- creating all 6 alongside the
  required 8 is low-risk (each is a direct, low-judgment mapping from its
  existing agent-portfolio.md contract, section 5.1) and keeps `review-tree`
  fully capable from day one rather than partially stubbed; the phase doc's
  "at minimum" list does not exclude them, it just does not require them
  explicitly. Alternative: build only the required 8 this round and add
  specialists individually as each is first triggered by a real change --
  more minimal, defers file-count growth, but leaves `review-tree` unable to
  fan out on day one for, say, a schema change, which would be a visible gap
  against Phase 4's Claude Code design (which already has all 6 specialists
  compiled and available via the shared 14-agent `.claude/agents/` roster).
