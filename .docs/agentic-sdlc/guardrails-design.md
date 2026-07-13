# Agentic SDLC -- Provider-Native Guardrails, Permissions, and Hooks (Design)

Date: 2026-07-13
Status: Proposal (Phase 6 segment 1 deliverable; awaiting Maintainer approval at
the gate recorded in section 7). Not yet built -- no file under
`.claude/settings.json`, `.codex/config.toml`, `.codex/agents/`,
`.agents/skills/`, or any hook script has been created or modified to produce
this document. This segment is design only, mirroring the design-then-gate-
then-build split already used for Phases 3, 4, and 5.
Companion documents: [claude-code-pipeline.md](claude-code-pipeline.md) and
[codex-pipeline.md](codex-pipeline.md) (the two pipelines this phase
hardens), [agent-portfolio.md](agent-portfolio.md) (the 14-agent portfolio,
section 6 role contracts), [risk-and-approval-policy.md](risk-and-approval-policy.md)
(the normative policy source for this phase -- section 2 absolute rules and
section 3 approval-gate triggers), [lifecycle.md](lifecycle.md),
[ADR-0012](../architecture/adr/ADR-0012-provider-native-agentic-sdlc-boundary.md)
(the hook-necessity bar in point 7).

## 1. Purpose and scope

Phase 4 (Claude Code) and Phase 5 (Codex) each built a native development
pipeline and, along the way, each added a partial guardrail layer as "do only
what is reasonable and low-risk here" (Phase 4 section 8; Phase 5 section 6),
explicitly deferring full guardrail coverage to this phase. This document is
the Phase 6 design: for every guardrail the phase doc requires, it determines
whether Phase 4's `.claude/settings.json` `permissions.deny` block or Phase
5's `.codex/config.toml`/`.codex/agents/*.toml` `sandbox_mode` assignments
already cover it, whether either can be trivially extended to cover it, or
whether a new mechanism -- native rule first, hook only if the ADR-0012 point
7 necessity bar is genuinely met -- is required. It also resolves, as the two
most load-bearing carry-overs, Phase 4's D5 (per-subagent Bash scoping for
`repository-analyst`, `regression-reviewer`, `deterministic-output`,
`supply-chain-risk`) and Phase 5's D1 (the Codex-side
`regression-reviewer`/`deterministic-output` instruction-only write
restriction).

Binding constraints carried over from the master prompt, ADR-0012, and the
phase doc, not repeated at each section below: development infrastructure
only, no AgentQuilt product feature (no change to
`packages/agentquilt-cli/src/` except the tiny-hook-helper exception, itself
flagged as a decision point rather than built), no custom policy engine or
orchestration runtime, provider-native mechanisms only (native permission
rules > native prompt hooks > existing repository commands > simple inline
shell commands, in that order), no live model calls in any hook or in
deterministic CI, plain ASCII text throughout (no emojis, smileys,
pictographic symbols, or em/en-dashes -- `--` only, applied from the first
draft per the corrective rounds both Phase 4 and Phase 5 needed).

## 2. Current-state findings (this segment)

Verified 2026-07-13 against the working tree on
`refactor/agentic-sdlc-boundary-cleanup` (clean; `git log --oneline -5` shows
Phase 4's two commits and Phase 5's three commits as the most recent history):

- **`.claude/settings.json`** (committed, Phase 4 commit `42bbc87`) contains
  exactly one `permissions.deny` block: four `Edit`/`Write` path-pattern
  pairs on the generated-file set (`/AGENTS.md`, `/CLAUDE.md`,
  `/.claude/agents/**`, `/agentquilt.lock`), and six `Bash` prefix denies on
  the absolute-rule commands (`git push*`, `git tag*`, `npm publish*`,
  `npm version*`, `gh pr merge*`, `gh release*`). No `permissions.ask`
  entries. No `hooks` block. No per-agent scoping of any kind -- every rule
  applies uniformly to the main session and every subagent.
- **`.claude/agents/*.md`** (14 files, all compiler-managed): four carry a
  `tools: Read, Grep, Glob, Bash` frontmatter grant restricted to a specific
  command subset only by body-text prose, not by any provider mechanism --
  `repository-analyst` (read-only git history: `git log`, `git show`,
  `git blame`, `git diff`, `git ls-tree`, `git status`),
  `regression-reviewer` (`npx agentquilt check`, `npm test`, targeted golden
  runs), `deterministic-output` (`npm test` targeted golden runs,
  `npx agentquilt check`), `supply-chain-risk` (`npm ls`, `npm view`,
  `npm audit --dry-run`-style read-only queries). This is Phase 4's D5
  residual risk, unchanged since Phase 3 first flagged it. Verified by
  reading all four files' frontmatter and body text in full this segment.
- **`.codex/config.toml`** (committed, Phase 5 commit `fc256a0`) sets
  `default_permissions = ":read-only"` for the main interactive session only.
  No `[permissions.<name>]` custom profile (segment 2/3 of Phase 5 found no
  per-agent-TOML attachment path for one, so none is defined). No `[hooks]`
  table.
- **`.codex/agents/*.toml`** (14 files): 11 are `sandbox_mode = "read-only"`.
  `feature-implementer` is `sandbox_mode = "workspace-write"` as the sole
  general-purpose write-capable role (expected; not a residual risk).
  `regression-reviewer` and `deterministic-output` are ALSO
  `sandbox_mode = "workspace-write"`, each carrying an explicit
  "RESIDUAL-RISK NOTICE" block in `developer_instructions` naming an exact
  allowed-command set (`npm test`, `npm run build`, `npx agentquilt check`,
  read-only git commands) and prohibiting all file writes -- enforced only by
  that instruction text, not by the sandbox. This is Phase 5's D1 residual
  risk, verified by reading both files in full this segment. Named explicitly
  in the Phase 5 report as "the same shape as Claude Code's Phase 4 D5
  residual risk... not a regression relative to it."
- **Claude Code hook and permission mechanics, verified live against current
  documentation this segment** (`code.claude.com/docs/en/hooks`,
  `code.claude.com/docs/en/permissions`, matching the rigor Phase 4 and
  Phase 5 already applied to their own syntax questions):
  - `PreToolUse` hooks fire before a tool call and receive `agent_id` and
    `agent_type` in their JSON stdin payload "when running inside a
    subagent" -- `agent_type` is the custom agent's name from its
    frontmatter. A `PreToolUse` hook can deny a call by returning
    `{"hookSpecificOutput": {"hookEventName": "PreToolUse",
    "permissionDecision": "deny", "permissionDecisionReason": "..."}}` or by
    exiting 2 with the reason on stderr.
  - Permission rules (`permissions.deny`/`ask`/`allow` in `settings.json`)
    have **no per-subagent scoping in their matcher syntax** -- a `Bash(...)`
    rule matches by command pattern only, uniformly across every caller. The
    documentation's own stated workaround for subagent-specific Bash
    restriction is exactly a `PreToolUse` hook reading `agent_type` from its
    input, confirming this is a genuine mechanism gap a native rule cannot
    close, not a design oversight.
  - `SubagentStart`/`SubagentStop` hooks DO support a `matcher` field scoped
    to `agent_type` (the custom agent's name) -- but these events fire at
    subagent lifecycle boundaries (start/stop), not at each tool call inside
    the subagent's turn, so they cannot themselves deny an individual Bash
    invocation; they are the wrong event for command-level scoping (useful
    only for the "surface state" and "verify before stop" behaviors in
    section 5).
  - `SessionStart` cannot block (informational-only event, no
    `permissionDecision`/`decision` control documented for it). `Stop` and
    `SubagentStop` can block, via a top-level `{"decision": "block", "reason":
    "..."}`.
  - Deny rules win over allow rules from every scope including
    `settings.local.json` (already confirmed by Phase 4). A blocking
    `PreToolUse` hook (exit 2, or `permissionDecision: "deny"`) takes
    precedence over an `allow` rule -- confirmed this segment, directly
    relevant to whether a hook can add a restriction beyond what
    `settings.local.json`'s broad personal allow-list already grants (it
    can).
- **Codex hook and permission mechanics, verified live against current
  documentation this segment** (`learn.chatgpt.com/docs/hooks`,
  `learn.chatgpt.com/docs/config-file/config-reference`, and the
  `agent-configuration/subagents` page Phase 5 already used):
  - Supported events: `PreToolUse`, `PermissionRequest`, `PostToolUse`,
    `PreCompact`, `PostCompact`, `SessionStart`, `SubagentStart`,
    `SubagentStop`, `UserPromptSubmit`, `Stop`. Hooks load from
    `~/.codex/hooks.json`, `~/.codex/config.toml` (`[hooks]`),
    `<repo>/.codex/hooks.json`, or `<repo>/.codex/config.toml` (`[hooks]`) --
    project-local hooks load only when the project's `.codex/` layer is
    trusted (same gating Phase 5 already confirmed for custom agents).
  - **`PreToolUse`'s documented input fields are `session_id`,
    `transcript_path`, `cwd`, `hook_event_name`, `model`, `permission_mode`,
    `turn_id`, `tool_name`, `tool_use_id`, `tool_input` -- there is no field
    identifying which custom agent (by name) triggered the call.** This is
    the decisive finding for this phase's Codex-side D1 question: unlike
    Claude Code's `agent_type` in the same event, Codex's `PreToolUse` hook
    cannot distinguish "this Bash call came from regression-reviewer" from
    "this Bash call came from the main session or feature-implementer." A
    Codex hook targeting only the two write-capable review specialists is
    therefore not expressible even with a hook, not just inconvenient --
    confirmed by direct query against the current documentation, not
    inferred.
  - `SubagentStart`/`SubagentStop` matchers ARE scoped to `agent_type`
    (mirroring Claude Code), but again only at the subagent lifecycle
    boundary, not per tool call -- the same "wrong event for command-level
    scoping" limitation as the Claude Code side.
  - Deny format: `{"hookSpecificOutput": {"hookEventName": "PreToolUse",
    "permissionDecision": "deny", "permissionDecisionReason": "..."}}`, or
    exit 2 with the reason on stderr -- the same shape as Claude Code's.
  - No per-agent command-allowlist field exists anywhere in the per-agent
    TOML schema beyond the three-way `sandbox_mode` enum -- re-confirmed this
    segment (`developer_instructions` can only guide behavior in prose, not
    enforce it), consistent with what Phase 5 already found and consistent
    with this segment's own finding above.

## 3. Per-guardrail coverage table (all 14 required guardrails)

For each guardrail: (a) already covered by an existing native mechanism, (b)
coverable by trivially extending that same mechanism, or (c) needs something
new -- and if (c), whether it meets the hook-necessity bar.

| # | Guardrail | Claude Code coverage | Codex coverage | New mechanism needed? |
| - | --------- | --------------------- | ---------------- | ------------------------ |
| 1 | Direct edits to generated files | (a) Already covered: `permissions.deny` on `/AGENTS.md`, `/CLAUDE.md`, `/.claude/agents/**`, `/agentquilt.lock` (Phase 4). | Not covered today: no per-file deny-list mechanism exists in Codex at all (confirmed absent from the permission reference, Phase 5 section 2.2/6.1). | (c) for Codex only. See D1 below -- a `PreToolUse` hook denying `apply_patch`/file-edit calls against the generated-file path set, scoped globally (not per-agent, since this guardrail is about the file path, not the caller). Meets the necessity bar: no native Codex rule expresses a file-path deny; the four required elements (provider requires a command handler for this, no rule suffices, no existing repo command provides it, dev-only, no model calls, documented here) are satisfied. |
| 2 | Unapproved dependency additions | Partially covered: no `permissions.deny` rule targets `package.json`/`package-lock.json` writes today, but the absolute-rule gate (risk-and-approval-policy section 3) is a human-approval-gate trigger, not a mechanical block -- an agent is instructed never to add a dependency without approval (agent-portfolio.md 6.3 `feature-implementer` prohibited actions), and this is inherently a judgment call (a legitimate task may need a dependency), not a pure path/command match. | Same: no mechanical block exists or is proposed. | (b), extend trivially: add `Edit`/`Write` deny entries for `package.json` and `package-lock.json` is NOT proposed (see D2) -- a blanket deny would also block the Maintainer's own legitimate dependency work and the many tasks that never touch dependencies would gain nothing. Recommendation: rely on the existing instruction-level prohibition plus the human approval gate (risk-and-approval-policy section 3), which is exactly the class of guardrail that is fundamentally a judgment call, not a static match -- matching Phase 4 section 8.3's identical reasoning for destructive-but-sometimes-legitimate operations. No new mechanism. |
| 3 | Destructive Git commands | (a) Already covered by Claude Code's documented default: any Bash command not on a committed `allow` list prompts for confirmation, and this phase's committed settings add no such allow entries for `rm -rf`, `git reset --hard`, `git checkout -- .`/`git restore .`, `git clean -f`, `git branch -D`, or history rewrites (Phase 4 section 8.3, unchanged). | (a) Already covered by Codex's equivalent: `default_permissions = ":read-only"` for the main session already requires an explicit per-session override before ANY write/execute action, and each custom agent's own `sandbox_mode` already governs whether it can run a destructive command at all (11 of 14 agents are `read-only` and cannot execute git-mutating commands regardless of instruction text -- confirmed this segment: `sandbox_mode = "read-only"` restricts local command execution, not just file writes). | No new mechanism on either side. See D3 (whether to strengthen with explicit `ask`-tier rules) -- recommendation below is still no, per Phase 4's unchanged reasoning. |
| 4 | Package publication | (a) Already covered: `Bash(npm publish*)` deny (Phase 4). | Not covered by an explicit deny (Codex has no path/command deny-list mechanism), but (a) already covered in practice: `npm publish` requires registry authentication this environment does not have configured for automated/agent use, and every Codex custom agent is `read-only` or `workspace-write` (never `danger-full-access`), so none can run an arbitrary un-sandboxed publish command; the main session's `:read-only` default also blocks it absent an explicit Maintainer override. | No new mechanism -- see D1's hook design, which additionally denies this pattern as a zero-cost bundle with guardrail 1 (same hook, same event, one more matcher entry) rather than a separate mechanism. |
| 5 | Version tagging | Same as #4: (a) already covered by `Bash(git tag*)` deny (Phase 4). | Same as #4 reasoning -- no explicit deny mechanism exists, covered in practice by sandbox defaults. | No new mechanism -- bundled into D1's hook alongside #1 and #4 for Codex. |
| 6 | Release creation | (a) Already covered: `Bash(gh release*)` deny (Phase 4); `gh pr merge*` also denied, covering the adjacent "no agent merges" absolute rule. | Same reasoning as #4/#5 -- `gh` is not installed/authenticated for agent use by default and every custom agent's sandbox already restricts it; no explicit deny mechanism exists in Codex to extend. | No new mechanism -- bundled into D1's hook for Codex (deny `gh release*`, `gh pr merge*` Bash matches as well, alongside the file-edit denials, since a single `PreToolUse` hook script can inspect both `apply_patch` and `Bash` tool calls in one pass). |
| 7 | Public interface changes | Not a static path/command match -- this is a judgment call (does this diff change CLI commands/flags/output/exit codes/config format?) requiring semantic review, not a permission rule. Already the explicit job of `architecture-reviewer` (Claude Code) / `architecture-reviewer` (Codex) at REV, per agent-portfolio.md 6.5 and the risk-and-approval-policy section 3 approval-gate trigger table. | Same. | No new mechanism on either side -- this guardrail is fundamentally a review-time human-approval-gate trigger (risk-and-approval-policy section 3), not something a permission rule or hook can mechanically detect. Reviewed, not gated at the tool-call layer. |
| 8 | Persisted-format changes | Same reasoning as #7: a semantic judgment (`schema-design` specialist's explicit job, agent-portfolio.md 6.10; risk-and-approval-policy section 3 trigger). | Same. | No new mechanism -- review-time trigger, not a tool-call-layer guardrail. |
| 9 | Schema compatibility | Same reasoning as #7/#8 -- `schema-design` specialist's job; not a static match. | Same. | No new mechanism. |
| 10 | Generated-output drift | (a) Already covered functionally: `regression-reviewer`'s RGR duty runs `npx agentquilt check` and treats a nonzero exit or untraceable generated diff as a BLOCKER (agent-portfolio.md 6.6; already the RGR completion criteria). This is detection-before-completion, which is exactly what the phase doc's "before completion: detect generated drift" behavior (section 5 below) asks for -- already an existing repository command (`npx agentquilt check`), already wired into the RGR stage's own completion criteria. | Same: `regression-reviewer`'s Codex `developer_instructions` already names `npx agentquilt check` as a required step with a recorded exit code (verified this segment by re-reading the file, section 2 above). | No new mechanism -- already covered by an existing repository command inside an existing role's stage duties, matching the phase doc's own preference order (existing repository commands over any new construct). See section 5 for whether a `Stop` hook should ALSO enforce this mechanically -- recommendation there is no, for the reason given in that section. |
| 11 | Skipped validation | Not a static match -- detecting "did VER/VAL actually run" requires either trusting the Return Handoff's own attestation (handoff-contract.md) or mechanically checking transcript/tool-call history for the authoritative command's invocation. See D4/D5 in section 5 (the "before completion: verify focused tests were run" required-behavior item) for the concrete design. | Same open question, addressed identically in section 5. | Addressed in section 5, not here -- this guardrail and required-behavior item 3 ("before completion: verify focused tests were run... run or request the full completion suite") are the same design question, not two separate ones. |
| 12 | Unexplained snapshot or fixture updates | (a) Already covered structurally: `test-engineer`'s (Claude Code) / the equivalent Codex role's prohibited actions already forbid updating fixtures without a root-cause explanation (agent-portfolio.md 6.4; risk-and-approval-policy section 6, an absolute-adjacent rule -- "an unexplained fixture diff is a BLOCKER finding" per review-contract). This is inherently a semantic judgment (is the explanation adequate?), which `regression-reviewer`/`architecture-reviewer` already perform as their explicit stage duty, not a static match a permission rule or hook could perform (a hook cannot judge whether an explanation is a genuine root cause or a rationalization). | Same -- Codex's `regression-reviewer` custom agent's `developer_instructions` already states this requirement verbatim (section 2 above). | No new mechanism -- review-time judgment, already assigned to an accountable role on both providers. |
| 13 | Accidental secret exposure | Not covered by any existing mechanism on either provider today. `security-review` (Claude Code) / the equivalent Codex specialist already scans for secret patterns as part of REV fan-out (agent-portfolio.md 6.9), but that is a post-hoc review step, not a pre-commit or pre-tool-use guard. | Same gap. | (c) evaluated against the necessity bar and NOT met: a general-purpose secret-pattern scanner is exactly the kind of "conditional logic a plain permission pattern cannot express" the bar is written for, BUT it also is not development-only in the narrow sense the bar requires trivial verification of (a real secret-pattern matcher is nontrivial regex/entropy logic, arguably approaching "custom policy engine" territory the phase doc explicitly forbids) and a materially adequate implementation already exists as `security-review`'s reviewed, human-auditable instruction body. Recommendation: rely on `security-review`'s existing REV-time scan (already a required specialist trigger per agent-portfolio.md 5.2 for the security high-risk trigger) plus each core role's own generic prohibition against exposing secrets (common contract, section 6 preamble) rather than building a new hook. See D6 for the narrower, genuinely bar-meeting alternative (a trivial `.env`/`*.pem`/credential-filename deny, not a content scanner). |
| 14 | Excessive scope expansion | Not a static match -- detecting "this diff touches files outside the handoff's allowed set" requires comparing the diff to the Implementation Handoff's named file list (handoff-contract.md), which is exactly `architecture-reviewer`'s REV checklist item ("verify the diff against the recorded classification and plan; excess is a HIGH finding", agent-portfolio.md 6.5). Already an explicit reviewer duty on both providers. | Same. | No new mechanism -- review-time judgment already assigned to an accountable role, requiring the handoff's own semantic content (which files were approved), not just a path pattern a permission rule could express context-free. |

Summary: of the 14 required guardrails, 8 are already fully covered by
existing native mechanisms on both providers with no change needed (#3, #7,
#8, #9, #10, #12, #13 relies on existing review coverage, #14). 3 are already
covered on the Claude Code side and covered in practice (though not by an
explicit deny rule) on the Codex side, and become fully covered on Codex once
D1's hook is built (#4, #5, #6, bundled with #1). 1 is already covered on
Claude Code and needs a new Codex-side hook because Codex has no equivalent
declarative file-path deny mechanism at all (#1). 1 is deliberately left to
the existing human-approval-gate/instruction-level mechanism on both
providers, matching Phase 4's own precedent for judgment-call guardrails
(#2). 1 is resolved by the required-behavior design in section 5, not a
standalone table entry (#11). Net new construct: exactly one hook, on the
Codex side only (D1), covering guardrails #1, #4, #5, #6 in a single script.

## 4. D5 (Claude Code) and D1 (Codex) residual-risk resolution

These are named separately, as instructed, because they are the two most
concrete and most load-bearing carry-overs into this phase -- not just one
row each in section 3.

### 4.1 Claude Code D5 -- per-subagent Bash command scoping

**Finding (section 2): a native permission rule cannot express "only when
`repository-analyst` is the caller" -- `permissions.deny` matches by command
pattern only, uniformly across every caller in a session. The documentation's
own stated mechanism for subagent-specific restriction is a `PreToolUse`
hook reading `agent_type` from its input.** This is exactly the shape
ADR-0012 point 7's necessity bar describes: the provider requires a command
handler for this specific check (a hook), no native rule can express it (the
`permissions.deny` matcher has no subagent dimension), no existing repository
command provides it, and the check itself -- comparing `agent_type` against a
fixed allow-list of command prefixes per agent -- is a few lines of shell/jq,
not an orchestration service.

**Design: a single `PreToolUse` hook in `.claude/settings.json`, matched on
`Bash`, that reads `agent_type` and `tool_input.command` from its stdin JSON
and denies the call unless the command matches that agent's specific
allow-list.** The four allow-lists are exactly the ones already stated in
prose in each agent's compiled body (section 2 above), now enforced
mechanically instead of only by instruction text:

- `repository-analyst`: `git log`, `git show`, `git blame`, `git diff`,
  `git ls-tree`, `git status` (read-only git only).
- `regression-reviewer`: `npm test`, `npm run build`, `npx agentquilt check`,
  plus the same read-only git set.
- `deterministic-output`: `npm test`, `npx agentquilt check`, plus the same
  read-only git set.
- `supply-chain-risk`: `npm ls`, `npm view`, `npm audit --dry-run` plus the
  same read-only git set.
- Every other `agent_type` (including the main session, `feature-implementer`,
  and `test-engineer`): the hook passes through with no decision (`exit 0`
  with no JSON, meaning "no opinion" per the documented default), leaving
  Claude Code's existing `permissions.deny`/`allow` rules as the sole
  authority for those callers, unchanged.

This is additive, not a replacement: the existing global `permissions.deny`
block (generated-file edits, absolute-rule commands) still applies to every
caller including these four agents; the hook adds a narrower, per-agent
restriction on top, exactly matching the four roles' own documented `x-claude`
tool grants (agent-portfolio.md section 6, decision D2 there). The hook
script is a tiny deterministic shell script (`jq`-based command matching
against a fixed table), contains no model call, and is development-only
(fires only inside this repository's own `.claude/settings.json`, never
shipped as product code). Necessity is documented here and in the hook
script's own header comment (D7 below decides the exact file location and
form).

### 4.2 Codex D1 -- regression-reviewer / deterministic-output write restriction

**Finding (section 2): unlike Claude Code, Codex's `PreToolUse` hook input has
no field identifying which custom agent is the caller at all.** Claude Code's
`agent_type` has no Codex equivalent in the `PreToolUse` payload (confirmed
by direct query against current documentation, not inferred from the
per-agent TOML schema question Phase 5 already answered). This means the
Claude Code D5 hook design in 4.1 -- read the caller's identity, apply a
per-agent command allow-list -- **is not expressible as a Codex hook at all**,
not merely inconvenient. `SubagentStart`/`SubagentStop` matchers ARE scoped to
`agent_type`, but those events fire only at the subagent's start and stop, not
per tool call inside its turn, so they cannot deny an individual `Bash`
invocation the way `PreToolUse` can.

**Consequence: there is no genuine hook-based hardening available for Phase
5's D1 on the Codex side beyond what already exists.** The `sandbox_mode`
per-agent assignment (`workspace-write` for these two roles, restricted only
by `developer_instructions` text) is already the most granular native
mechanism Codex exposes for this exact problem -- Phase 5 already established
this (no per-agent command-allowlist field exists beyond the three-way enum),
and this segment's independent re-verification of the `PreToolUse` hook path
confirms there is no alternative route to closing the gap either. Attempting
to build a hook that inspects `tool_input` alone (without caller identity)
and denies write-shaped `apply_patch`/`Bash` calls globally would not
distinguish `regression-reviewer` from `feature-implementer` (which
legitimately needs write access) -- it would either do nothing useful or
break the write-capable role's legitimate function, which is not a coherent
guardrail.

**Design: keep the Phase 5 mechanism (`sandbox_mode = "workspace-write"` plus
the RESIDUAL-RISK NOTICE instruction block) exactly as built, and document
this phase's finding as the reason no further native/hook hardening exists**
-- not a gap this phase failed to close, but a provider capability ceiling
confirmed by direct investigation. The one available, genuinely native
strengthening is narrower than what Phase 5 originally hoped for: neither a
hook (no caller identity available) nor a finer-grained sandbox profile
(confirmed absent) can help. See D2 (whether to accept this finding as final
or request a second documentation pass) for the decision point, though the
evidence gathered this segment (two independent targeted fetches converging
on the same "no agent-identity field" answer) is already as strong as what
Phase 5 itself required before accepting its own D1 finding.

## 5. Required behavior -- native design per item

The phase doc's four "Required behavior" items, each evaluated against
whether a hook is the right fit, an existing skill/instruction convention
already covers it, or neither is needed:

### 5.1 Session start: surface branch/tree state, canonical-vs-generated reminder, authoritative commands

**Design: no hook.** `SessionStart` (Claude Code) and the equivalent
project-config/`AGENTS.md`-load path (Codex) are informational, non-blocking
events by design (section 2: `SessionStart` has no documented
`permissionDecision`/`decision` control at all). Building a `SessionStart`
hook that runs `git status`/`git branch` and prints output would duplicate
what root `AGENTS.md`/`CLAUDE.md` (compiled from the `project/` fragments)
already states as a standing instruction -- "Generated files... must never be
manually edited... edit the fragments and regenerate with
`npx agentquilt build`" -- and what the six Claude Code skills / eight Codex
skills already do at their own entry points (`analyze-issue`'s first step is
already, per its own design, to establish current repository state before
investigating). This is exactly the "instruction-level convention already
implicit in the skills Phase 4/5 built" case the task instructions asked to
identify and NOT duplicate with a redundant hook. Recommendation: add one
short reminder line to each skill/command's own entry step (not a new hook,
not a settings change) stating "confirm branch and working-tree state before
proceeding" where a skill's body does not already imply it -- a documentation
touch-up to the existing skill/command bodies, not a guardrail mechanism, and
therefore not built by this segment (design-only; see D3 on whether to defer
this wording pass to the build segment).

### 5.2 Before sensitive operations: require explicit approval

**Design: already the job of the existing `plan-change`/`plan-change`-
equivalent skill's stop behavior (Phase 4 section 4.2, Phase 5 section 5.2)
plus the D1 hook's deny responses (section 4) for the mechanically-detectable
subset (file-path and absolute-rule-command matches).** "Sensitive operation"
in the phase doc's sense spans two different things this design keeps
separate rather than conflating into one mechanism:

- The APP checkpoint (risk-and-approval-policy section 3 trigger table --
  architecture changes, public interface changes, new dependencies,
  persisted-format changes, generated-output semantics changes, destructive
  operations, releases) is a semantic judgment already owned by
  `plan-change`'s stop behavior and `architecture-reviewer`'s REV findings --
  no hook can evaluate "is this architecturally significant," so this
  category stays exactly as Phase 4/5 already built it.
- The mechanically-detectable subset (generated-file edits, absolute-rule
  commands) is what the existing `permissions.deny` (Claude Code) and the new
  D1 hook (Codex) already deny outright -- "require explicit approval" is
  satisfied more strongly than approval-then-proceed, by blocking the action
  entirely, which is the correct behavior for the absolute rules
  (risk-and-approval-policy section 2 -- these have "no exceptions, any
  profile", so an approval prompt that could be answered yes would be the
  wrong mechanism; an outright deny is the accurate translation of "no agent
  approves a plan, approves a PR, merges, tags, pushes, publishes").

No new mechanism beyond what sections 3-4 already design.

### 5.3 Before completion: verify focused tests were run; run/request the full completion suite

**Design: a `Stop` hook (Claude Code) is the right fit here, evaluated
against the necessity bar and judged to meet it narrowly -- but recommended
NOT to build it this phase, in favor of the existing Return
Handoff/Validation Evidence artifact convention, with the hook named as the
fallback if the artifact convention proves insufficient in practice (D4).**
Reasoning:

- `Stop` can block (`{"decision": "block", "reason": "..."}`) and is the only
  event positioned at the right moment (end of a turn) to ask "did the
  authoritative command actually run this turn." A hook COULD grep the
  transcript for evidence that `npm test`/`npx agentquilt check` executed
  before allowing the session to stop.
- However, this is real conditional logic operating on transcript content,
  not a static path/command match -- closer to "requires understanding
  intent" than the D1 hook's simple command-allow-list lookup. A naive
  transcript grep for the command string is gameable (a command could appear
  in a comment, a quoted example, or a prior unrelated turn) and a more
  robust implementation risks becoming exactly the "custom policy engine"
  ADR-0012 and the phase doc forbid.
- The existing mechanism -- `implement-task`'s Return Handoff already has a
  required "focused verification" section (handoff-contract.md), and
  `test-engineer`'s VAL completion criteria already require the full
  deterministic suite to pass before PRP -- is a human-and-agent-legible
  artifact trail that already satisfies the same intent without a hook: a
  reviewer (`architecture-reviewer`/`regression-reviewer`) already checks for
  this at REV/RGR as an explicit checklist item, and an absent or fabricated
  verification claim is exactly the kind of thing REV is designed to catch
  (a false claim in the Return Handoff is a BLOCKER finding by contract).
- Recommendation: keep the artifact-and-review convention as the primary
  mechanism (no hook this phase); name the `Stop` hook explicitly as the
  documented fallback if, after real use, unverified completions are
  observed slipping past review in practice (D4). This mirrors the "don't
  add a hook where an existing convention already covers the same intent"
  instruction directly.
- On the Codex side, the equivalent `Stop` event exists (section 2) with the
  same reasoning applying identically -- same recommendation, same fallback
  framing, no provider divergence here.

### 5.4 Before completion: detect generated drift; report uncommitted/unexplained files

**Design: no new hook -- already covered by an existing repository command,
already wired into an existing role's stage duty (section 3, guardrail #10).**
`npx agentquilt check` is the authoritative drift command
(validation-evidence.md section 3); `regression-reviewer`'s RGR completion
criteria already require running it and recording the exit code, with a
nonzero result or untraceable generated diff already defined as a BLOCKER by
contract. "Report uncommitted or unexplained files" is already `git status`,
an existing repository command every role already has read access to via
`Bash`/read-only git (or, for roles without Bash, the main session can run it
directly) -- this is squarely the phase doc's own "existing repository
commands" preference, already exercised, and does not meet the hook necessity
bar (an existing repository command already provides it, which is explicitly
one of the four bar-failing conditions). No new mechanism.

## 6. Acceptance-test procedure (design for segment 2, not executed this segment)

Per the phase doc's "Acceptance tests" section and the master prompt's
explicit instruction for this segment: DO NOT attempt any of these seven
cases now. This is the concrete, step-by-step plan segment 2 executes AFTER
the Maintainer approves this design (and, for the Git-command and
publication-attempt cases specifically, only in the reversible/isolated form
described below, since those two are themselves gate triggers under
execution-model.md section 7 regardless of "just a test").

| # | Case | Isolated/reversible method | Expected native-mechanism response |
| - | ---- | ---------------------------- | -------------------------------------- |
| 1 | Editing a generated file | In the same working tree (no destructive git needed -- an `Edit`/`Write` attempt is not itself destructive, it is simply denied before it touches disk): attempt `Edit` on `CLAUDE.md` in a live Claude Code session; attempt the equivalent `apply_patch`-shaped edit in a live Codex session after D1's hook is built. Nothing to revert either way, since the denial fires before any write. | Claude Code: `permissions.deny` fires immediately, tool call blocked with a clear reason shown in the transcript (already true today, per Phase 4's committed rule -- segment 2 only needs to observe it live, not build anything new). Codex: D1's new `PreToolUse` hook denies the `apply_patch` call with `permissionDecisionReason` naming the generated-file path. |
| 2 | Adding a dependency | On a scratch branch (`git checkout -b scratch/phase6-accept-test`, deleted immediately after observation, never pushed): attempt `npm install <trivial-package>` via a live session; observe whether the instruction-level prohibition (agent-portfolio.md 6.3) and the human approval gate are what actually stop it (expected: nothing mechanically blocks the `npm install` command itself, per section 3 guardrail #2's finding -- the guard is the reviewer/gate, not a permission rule). Revert with `git checkout -- package.json package-lock.json` and delete the scratch branch immediately after observing. | No mechanical block expected (by design, per D2/guardrail #2) -- the session's own instructions should refuse to proceed without a recorded approval; segment 2 records whether that refusal actually happens in practice, which is new evidence, not a foregone conclusion. |
| 3 | Running a destructive Git command | NOT run for real, even reversibly, per this segment's own stop condition and per execution-model.md section 7 (destructive operation is a gate trigger). Segment 2's test is to attempt `git reset --hard HEAD~1` in a live session on a throwaway scratch branch created solely for this observation, with the branch's HEAD noted beforehand and the branch deleted (not reset) immediately after observing the confirmation prompt appear -- never actually confirming the reset. | Claude Code: existing default confirm-before-run behavior fires (Phase 4 section 8.3, unchanged) -- a prompt appears; segment 2 answers "no" and deletes the scratch branch. Codex: the main session's `:read-only` default already requires an explicit override before any write/execute; a spawned custom agent's own `sandbox_mode` (11 of 14 are `read-only`) blocks it outright for those agents. |
| 4 | Skipping tests | Attempt to have a live session claim IMP/VER complete without having run the focused test command, and observe whether REV (`architecture-reviewer`) catches the absent/fabricated verification claim in the Return Handoff at review time (expected mechanism: section 5.3's artifact-and-review convention, not a Stop-hook denial, since no Stop hook is built by this design). | Detected before completion, not blocked outright -- REV should flag a BLOCKER finding for an absent or unsubstantiated verification claim, per review-contract's existing BLOCKER definition. If this fails to be caught in practice, that is the evidence for D4's fallback hook. |
| 5 | Changing a schema | Attempt a trivial, immediately-reverted edit to a file under `schemas/*.schema.json` or the Zod schemas, observe that no permission rule blocks the edit itself (expected -- this is a review-time trigger per section 3 guardrail #8/#9, not a tool-call-layer guardrail) but that `schema-design`'s specialist trigger fires at REV. Revert with `git checkout -- <file>` immediately after observing. | Not blocked at the tool-call layer (by design). Detected at REV: `schema-design` specialist engages per its documented trigger (agent-portfolio.md 6.10), producing a compatibility verdict; the change should not reach PRP without that review, per the existing standard/high-risk profile routing (agent-portfolio.md 5.1). |
| 6 | Updating a golden fixture | Attempt a trivial, immediately-reverted edit to a file under `packages/agentquilt-cli/tests/fixtures/golden/*/expected/`, observe that the edit itself is not blocked (expected, same reasoning as case 5) but that `regression-reviewer`/`deterministic-output` treats an unexplained fixture diff as a BLOCKER per their existing contract (agent-portfolio.md 6.6, 6.11; risk-and-approval-policy section 6). Revert immediately with `git checkout -- <file>`. | Not blocked at the tool-call layer. Detected at RGR: BLOCKER finding for an unexplained fixture diff, exactly as risk-and-approval-policy section 6 already requires -- segment 2 confirms this fires in a live review pass, not just in the contract text. |
| 7 | Attempting publication | NOT run for real, per this segment's own stop condition (publication attempts are explicitly named as a gate trigger, execution-model.md section 7, "Release creation or publication: never performed by an executor at all"). Segment 2's test is to attempt `npm publish --dry-run` (a genuinely non-destructive, non-network-mutating dry-run flag that does not publish) in a live session on the current branch, or, if a live session cannot be safely isolated even for the dry-run flag, to instead confirm the `permissions.deny`/D1-hook rule fires by inspecting the transcript of an attempted plain `npm publish` command that the tool-permission layer intercepts before any network call is made (Claude Code: `Bash(npm publish*)` deny fires pre-execution, so even a non-dry-run attempt never reaches the network; Codex: D1's hook denies the `Bash` call before execution for the same reason). No actual publish, dry-run or otherwise, executed without this pre-execution deny already having been the first thing observed. | Blocked outright, pre-execution, on both providers -- Claude Code's existing `Bash(npm publish*)` deny (Phase 4) and Codex's new D1 hook match the command before any network call is attempted, so even the dry-run variant never runs; segment 2 records the denial message from the transcript as evidence, not the dry-run's own output. |

## 7. Explicit non-goals

- No custom policy engine, orchestration service, or Node/Python/TypeScript
  runtime of any kind. The one hook this design proposes (D1, section 4.1) is
  a fixed-table command-prefix lookup against `agent_type`, not a general
  rule engine.
- No change to `packages/agentquilt-cli/src/` in this segment. The
  tiny-hook-helper exception (ADR-0012 point 7) is evaluated in section 4.1
  and judged to apply to a `.claude/settings.json`-local shell/jq script, NOT
  to any product source file -- no product code is touched, and none is
  proposed.
- No Codex-side hardening of D1 beyond what already exists (section 4.2) --
  the finding that no caller-identity field exists in Codex's `PreToolUse`
  payload is a provider capability ceiling, not a gap this phase leaves
  unaddressed by choice.
- No `SessionStart`/`Stop` hook for the "surface state" or "verify
  completion" required-behavior items (sections 5.1, 5.3) -- both are judged
  better served by the existing instruction/artifact conventions Phase 4/5
  already built, with the `Stop` hook named as an explicit, not-yet-built
  fallback (D4) rather than silently dropped.
- No mechanical guard for guardrails #2 (dependency additions), #7
  (public interface), #8/#9 (schema/persisted-format), #12 (unexplained
  fixture updates), #13 (secret exposure beyond a narrow filename deny, D6),
  or #14 (scope expansion) -- all seven are semantic judgments already
  assigned to an accountable reviewing role, and building a mechanical
  approximation for any of them risks exactly the "custom policy engine"
  ADR-0012 forbids for a worse result than the existing human-reviewed
  process.
- No actual attempt at any of the seven acceptance-test cases this segment
  (section 6 is a plan for segment 2, not an execution log).
- No file created or modified under `.claude/settings.json`,
  `.codex/config.toml`, `.codex/agents/`, `.agents/skills/`, or any hook
  script this segment.

## 8. Decision points for the Maintainer (gate)

- **D1 -- Codex file-edit/absolute-rule hook (section 3 guardrail #1, section
  4.1's Claude Code analogue).** Build a project-local `.codex/hooks.json` (or
  `[hooks]` table in `.codex/config.toml`) `PreToolUse` hook, matched on
  `apply_patch` and `Bash`, that denies edits to the generated-file set
  (`AGENTS.md`, `CLAUDE.md`, `.claude/agents/**`, `agentquilt.lock`) and
  denies `Bash` matches against the absolute-rule command set (`git push`,
  `git tag`, `npm publish`, `npm version`, `gh pr merge`, `gh release`) --
  the Codex-side equivalent of Claude Code's already-committed
  `permissions.deny` block, closing the one guardrail (#1, bundled with #4,
  #5, #6) where Codex has no native declarative alternative at all.
  Recommendation: approve -- this is the one guardrail in the whole table
  that meets the necessity bar cleanly (no native Codex rule exists; an
  existing repository command does not provide file-path/command-pattern
  denial; the check is a small fixed-pattern match, not conditional business
  logic; development-only; no model call; necessity documented here).
  Alternative: rely only on `sandbox_mode` per custom agent plus the main
  session's `:read-only` default (already true today) and accept that the
  MAIN interactive session (not a spawned agent) has no mechanical guard
  against a generated-file edit or an absolute-rule command -- this was
  already flagged as an open gap by Phase 5's own D6 alternative and is
  exactly the gap this decision proposes closing; not recommended, since the
  gap is closeable at low cost and Claude Code already has the equivalent
  parity.
- **D2 -- Claude Code D5 per-subagent Bash-scoping hook (section 4.1).**
  Build the `PreToolUse` hook reading `agent_type` and applying the four
  named allow-lists (`repository-analyst`, `regression-reviewer`,
  `deterministic-output`, `supply-chain-risk`). Recommendation: approve --
  this is the phase doc's own most concrete named starting obligation on the
  Claude Code side, the necessity bar is met (documented mechanism gap in
  `permissions.deny`'s matcher, no existing repository command provides
  per-caller Bash scoping, small fixed-table check, development-only, no
  model call), and it converts Phase 3/4's long-standing residual risk from
  "restricted by instruction text only" to "restricted by instruction text
  AND a provider-enforced mechanism," which is exactly this phase's purpose.
  Alternative: do not build it and accept the residual risk permanently
  (matching where Codex's D1 is forced to land, section 4.2) -- not
  recommended here specifically because, unlike Codex, Claude Code's
  `PreToolUse` payload DOES carry the caller identity needed, so declining to
  use it would be leaving a closeable gap open for no technical reason,
  unlike Codex's genuine ceiling.
- **D3 -- Destructive-operation `ask`-tier rules (section 3 guardrail #3).**
  Continue relying on Claude Code's and Codex's existing default
  confirm-before-run/read-only-session behavior for `rm -rf`,
  `git reset --hard`, `git clean -f`, `git branch -D`, and history rewrites,
  adding no new explicit rule on either provider. Recommendation: approve as
  specified, unchanged from Phase 4 section 8.3's identical reasoning and
  Phase 5 section 6.3's identical reasoning -- both defaults already satisfy
  risk-and-approval-policy rule 2's "prior recorded human approval" without
  a new rule, and this phase finds no new fact that would change that
  conclusion. Alternative: add explicit `permissions.ask` entries (Claude
  Code) for these patterns now that the `ask` tier is confirmed to exist
  (Phase 4 already confirmed this) -- a genuine option, not recommended only
  because it strengthens an already-satisfied behavior at the cost of an
  extra confirmation step for the Maintainer's own legitimate destructive
  operations (for example, cleaning a scratch branch), which the phase doc's
  "legitimate normal development remains practical" acceptance criterion
  weighs against.
- **D4 -- `Stop`-hook fallback for skipped-validation detection (section
  5.3).** Do not build a `Stop`/completion-verification hook this phase;
  rely on the Return Handoff / Validation Evidence artifact trail plus
  REV/RGR's existing BLOCKER-on-absent-verification duty, and treat the
  hook as a named, not-yet-built fallback to reconsider only if segment 2's
  acceptance test (case 4, section 6) or later real use shows the artifact
  convention actually failing to catch a skipped-verification claim in
  practice. Recommendation: approve as specified -- building a transcript-
  inspecting hook now, before observing whether the existing convention
  actually fails, risks exactly the "custom policy engine" overreach the
  phase doc warns against for a problem that may not materialize.
  Alternative: build the `Stop` hook now, preemptively -- not recommended
  without first observing a real failure of the existing convention, per the
  necessity bar's own spirit (build the smallest thing that is actually
  needed, not the smallest thing that might theoretically help).
- **D5 -- Skill/command entry-step wording pass for session-start state
  surfacing (section 5.1).** Defer this wording touch-up (adding an explicit
  "confirm branch and working-tree state" line to each skill/command's entry
  step, where not already implied) to the build segment rather than treating
  it as a Phase 6 guardrail deliverable in its own right, since it is a
  documentation edit to already-approved Phase 4/5 files, not a new
  guardrail mechanism. Recommendation: approve -- defer to segment 2, done
  as a small, explicitly-scoped documentation pass alongside the D1/D2 hook
  builds, not skipped outright. Alternative: treat it as out of scope for
  Phase 6 entirely, leaving Phase 4/5's skill bodies unchanged -- not
  recommended, since the phase doc's own required-behavior list explicitly
  names this and a one-line addition per file is low-cost.
- **D6 -- Narrow secret-filename deny (section 3 guardrail #13).** Add a
  small, explicit `permissions.deny`/hook-equivalent rule denying
  `Read`/`Edit`/`Write` (Claude Code) and the Codex D1 hook's file-path check
  (Codex) against an explicit, narrow filename set commonly holding secrets
  (`.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa*`) as a deliberately minimal,
  genuinely bar-meeting addition, distinct from and much smaller than a
  general secret-content scanner (which section 3 already recommends against
  building). Recommendation: approve as a small addition bundled into the
  same D1/D2 hook work, since the marginal cost is one more path pattern in
  an already-approved mechanism, not a new mechanism of its own -- this
  repository does not currently contain any such file (verified absent this
  segment via the existing repository layout), so the rule is a preventive
  guard with no legitimate-workflow cost. Alternative: skip this and rely
  solely on `security-review`'s REV-time pattern scan (section 3's original
  recommendation) -- also reasonable, since no committed-secret incident or
  `.env`-adjacent file has ever existed in this repository; the marginal
  safety benefit of D6 is small precisely because the risk is already low,
  so this is a genuine either-way call, not a strong recommendation either
  way.
- **D7 -- Hook file location and form (Claude Code D2 hook, Codex D1 hook).**
  For Claude Code: a `hooks` block directly inside the committed
  `.claude/settings.json` (matching where the existing `permissions.deny`
  block already lives) with the command handler as an inline shell one-liner
  if short enough, or a small script file under `.claude/hooks/` if the
  four-agent table makes an inline command unreadable. For Codex: a
  project-local `.codex/hooks.json` (kept separate from `.codex/config.toml`
  rather than an inline `[hooks]` table, for the same "keep the guardrail
  mechanism visually separate from the agent-registry/permission-default
  file" reasoning `.codex/config.toml`'s own comments already used to justify
  not defining an orphaned permission profile there). Recommendation:
  approve both as specified -- pending segment 2's own syntax check of
  whether Claude Code's `hooks` block supports a `command` field pointing at
  a repository-relative script path cleanly enough to avoid an unreadable
  inline one-liner for a four-branch lookup table (a plausible segment-2
  syntax finding, matching the pattern both Phase 4 and Phase 5 already
  established of re-verifying exact syntax immediately before writing the
  file, not assuming it from this design). Alternative: put both hook
  scripts under a shared top-level `scripts/agentic-sdlc-hooks/` directory
  instead of provider-specific locations, for single-location discoverability
  -- not recommended, since each hook is genuinely provider-specific
  (different input JSON shape, different deny-response shape even though
  structurally similar) and colocating with each provider's own config
  directory matches how Phase 4/5 already organized every other pipeline
  asset (provider-specific duplication accepted and documented, per
  ADR-0012 point 3).
