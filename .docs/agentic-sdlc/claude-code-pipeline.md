# Agentic SDLC — Claude Code-Native Development Pipeline (Proposal)

Date: 2026-07-13
Status: Proposal (Phase 4 segment 1 deliverable; awaiting Maintainer approval at
the gate recorded in section 9). Not yet built — this document specifies what
segment 2 creates, after approval, and nothing under `.claude/` or
`.agentquilt/` has been changed to produce it.
Companion documents: [agent-portfolio.md](agent-portfolio.md) (the 14-agent
portfolio this pipeline routes to; section 6 role contracts are the normative
source and are not restated here), [lifecycle.md](lifecycle.md) (stage
catalog and profiles), the eight standard artifact contracts
([task-classification](task-classification.md),
[risk-and-approval-policy](risk-and-approval-policy.md),
[investigation-contract](investigation-contract.md),
[implementation-plan-contract](implementation-plan-contract.md),
[review-contract](review-contract.md),
[validation-evidence](validation-evidence.md),
[handoff-contract](handoff-contract.md),
[completion-contract](completion-contract.md)),
[ADR-0012](../architecture/adr/ADR-0012-provider-native-agentic-sdlc-boundary.md)
(provider-native boundary, including the hook-necessity bar in point 7).

## 1. Purpose and scope

This document is the Claude Code-native implementation design for the
standard AgentQuilt development loop: 8 required workflows (analyze an issue,
plan a change, develop an issue, implement one approved task, review the
working tree, fix failing CI, prepare a pull request, assess release
readiness), expressed as Claude Code skills and commands that delegate to the
14 agents Phase 3 built. It also proposes the smallest set of settings/
permission changes that move two of Phase 3's instruction-text-only
restrictions ("read-only agents do not edit", "generated files are not
intentionally edited") to provider-enforced rules, within the "do only what
is reasonable and low-risk here" bound the phase doc sets (full guardrail
enforcement remains Phase 6).

Binding constraints carried over from the master prompt and ADR-0012, not
repeated at each section below: development infrastructure only, no
AgentQuilt product feature, no change to `packages/agentquilt-cli/src/`, no
custom runtime/SDK/orchestrator, no CI workflow invokes a model, canonical
sources edited and generated files only rebuilt, plain text only (no emojis
or pictographs).

## 2. Current-state findings (inspection, this segment)

Verified 2026-07-13 against the working tree on `refactor/agentic-sdlc-boundary-cleanup`:

- **`.claude/` inventory**: `.claude/agents/` holds the 14 Phase 3 compiled
  agents (verified format: YAML frontmatter `name`, `description`, `model`,
  optional `tools`, body text). No `.claude/skills/`, no `.claude/commands/`,
  no `.claude/hooks/` directory exists. `.claude/settings.json` (committed)
  contains only `{"enabledPlugins": {"github@claude-plugins-official": true}}`
  — no permissions or hooks block today. `.claude/settings.local.json`
  (personal, gitignored) carries a long `permissions.allow` list accumulated
  from prior debugging sessions, including broad prefix allows such as
  `Bash(git checkout *)`, `Bash(git branch *)`, `Bash(git merge *)`,
  `Bash(bash *)`, `Bash(npm install *)`. This is flagged as a risk in section
  8.4, not corrected here (it is local and out of this phase's committed
  scope).
- **Installed Claude Code version**: `2.1.193` (`claude --version`). Skill,
  command, and settings-permission syntax below is written against this
  version's documented mechanisms as best known; section 9 flags the specific
  points segment 2 must confirm empirically before committing (a
  first-argument sanity check, not a live-eval exercise).
- **`.agentquilt/skills/` and the `agentskills` adapter are a different,
  vendor-neutral mechanism, not a Claude Code discovery path.** Confirmed in
  `packages/agentquilt-cli/src/core/adapters/agentskills.ts` and
  `src/core/configLoader.ts`: the `agentskills` platform compiles to
  `.agents/skills/<name>/SKILL.md`, an open, cross-tool standard
  (agentskills.io) that AgentQuilt's compiler can target for any consuming
  repository's product skills. It is not documented anywhere in this
  repository as a location Claude Code itself reads, and Phase 3 did not use
  it for the 14 development agents (those went through the `claude` adapter
  to `.claude/agents/`, the confirmed-native location). Using the
  `agentskills` target for this phase's pipeline skills would produce files
  in a location with no confirmed Claude Code discovery, risking the
  "skills trigger correctly" validation bullet outright. See decision D2.
- **CONTRIBUTING.md, README.md**: consistent with the lifecycle contracts;
  no changes needed for this phase (README's platform table and directory
  tree already describe `.claude/agents/` correctly; CONTRIBUTING's PR
  expectations map directly onto the PR Summary format this phase's
  `prepare-pr` command fills in).
- **`.github/workflows/*.yml`**: `intake.yml`, `pr-review.yml`, `release.yml`
  post human-readable comments naming retired agents (`product-discovery`,
  `code-review`, `release-manager`, `changelog`, `versioning`,
  `migration-guide`) and are otherwise deterministic, model-free jobs
  (typecheck/test/coverage/build/drift). This was already flagged as Phase 7
  scope in the Phase 2 and Phase 3 reports; nothing here calls a model API,
  so it does not block this phase, and this phase does not touch these
  files (editing GitHub Actions content is out of this phase's remit — it
  adds Claude-Code-side skills/commands, not CI).
- **`packages/agentquilt-cli/`**: not touched, and nothing in this design
  requires it to change. Confirmed by reading `src/index.ts`,
  `src/core/configLoader.ts`, `src/core/adapters/agentskills.ts`, and
  `src/commands/init.ts` only to establish the `.agents/skills/` fact above
  — no edits made.

## 3. Design principle: skill vs. command per workflow

Claude Code skills are description-triggered (the session may pull one in
automatically when its trigger conditions match, and any workflow can also be
invoked explicitly by name via the Skill tool) and are the right shape for
multi-step domain procedures that compose several delegations and produce a
structured artifact — this matches how this environment's own global skills
(`code-review`, `review`, `security-review`, `verify`) are already shaped.
Commands are user-invoked only (an explicit slash-style trigger, taking
`$ARGUMENTS`) and fit a workflow that is a single bounded action assembling
already-produced evidence into one artifact, where auto-discovery adds no
value and the maintainer always starts it deliberately.

| # | Required workflow | Shape | Why |
| - | ------------------ | ----- | --- |
| 1 | analyze an issue | Skill `analyze-issue` | Multi-step (CLS + INV), may fan out to parallel read-only analysts, produces two artifacts |
| 2 | plan a change | Skill `plan-change` | Multi-step (PLN, consults specialists' triggers), stops at an approval gate |
| 3 | develop an issue | Skill `develop-issue` | The full 13-step composite; needs to be reachable both by explicit maintainer request and by recognizing "work this issue end to end" phrasing |
| 4 | implement one approved task | Skill `implement-task` | Multi-step (dispatch IMP, run VER, produce Return Handoff); reused inside `develop-issue`'s loop and standalone once a plan is approved |
| 5 | review the working tree | Skill `review-tree` | Multi-step (REV primary plus conditional specialist fan-out), produces Review Findings |
| 6 | fix failing CI | Skill `fix-ci` | Multi-step (diagnose, delegate fix, re-verify, possibly reclassify) |
| 7 | prepare a pull request | Command `/prepare-pr` | One-shot: assemble the PR Summary from artifacts already produced this session; no benefit from auto-discovery, and it is the workflow most worth gating on deliberate invocation since it is adjacent to the "no agent opens/pushes a PR" absolute rule |
| 8 | assess release readiness | Command `/release-readiness` | One-shot: assemble the Release-Readiness Summary; deliberately maintainer-started (a release is never ambient) |

This 6-skill/2-command split, and specifically making `develop-issue` a skill
rather than a command, is a design judgment call — flagged as decision D1 in
section 9 rather than assumed.

## 4. Workflow designs

Every skill/command body (segment 2) states, self-contained: purpose,
triggering conditions, which named Phase 3 agent(s) it delegates to via the
Agent/Task tool's `subagent_type` parameter (never inventing a new agent —
Phase 3's 14 are the complete roster), the artifact format it produces (by
anchor link into the contracts, never restated per handoff-contract rule 2),
and the prohibited actions from the common contract
([agent-portfolio.md section 6 preamble](agent-portfolio.md#6-role-contracts)).
Routing below cites [agent-portfolio.md section 5.2](agent-portfolio.md#52-by-task-type-typical-classification-and-specialist-routing)
for specialist triggers rather than restating that table.

### 4.1 `analyze-issue` (skill) — CLS + INV

- Input: an issue reference, PR description, or free-text request.
- Steps: (1) record a Task Classification per
  [task-classification section 3](task-classification.md#3-artifact-format-task-classification),
  checking every high-risk trigger and small-profile criterion; (2) if
  acceptance criteria are missing, subjective, or unfalsifiable, delegate to
  `ambiguity-detector` before proceeding; (3) delegate to `repository-analyst`
  for the Repository Investigation
  ([format](investigation-contract.md#4-artifact-format-repository-investigation)) —
  light for the small profile, full for standard, multiple parallel
  `repository-analyst` instances on disjoint questions for high-risk (see
  section 5).
- Output: Task Classification + Repository Investigation, both self-contained
  per handoff-contract rule 1, ready for `plan-change` or, in the small
  profile, directly for `implement-task`.
- Never: implements, edits, or downgrades a classification (agents never
  downgrade — [task-classification section 4](task-classification.md#4-reclassification-rules)).

### 4.2 `plan-change` (skill) — PLN (+ CLS re-confirmation) + APP trigger

- Entry: a Repository Investigation exists (from `analyze-issue` or supplied
  directly).
- Steps: (1) delegate to `implementation-planner` for the Implementation Plan
  ([format](implementation-plan-contract.md#4-artifact-format-implementation-plan));
  (2) if the plan's done criteria are not checkable, delegate to
  `ambiguity-detector` on request; (3) flag every classification trigger
  found as a risk flag with its gate
  ([risk-and-approval-policy section 3](risk-and-approval-policy.md#3-approval-gate-triggers));
  (4) name which specialists the plan expects at REV per
  [agent-portfolio.md section 5.2](agent-portfolio.md#52-by-task-type-typical-classification-and-specialist-routing)
  as advisory notes only (specialists do not engage at PLN, they review later).
- Approval gate: if any risk flag is present, or the profile is high-risk, the
  skill stops after presenting the plan and investigation and states plainly
  that it is pausing for the Maintainer's recorded decision
  ([policy section 5](risk-and-approval-policy.md#5-recording-decisions)) — it
  does not invoke `implement-task` until that decision is recorded in the
  conversation or the artifact. This is the "pause for approval when
  required" step of the develop-issue loop, made concrete: no further
  delegation happens in the same turn a gate is reached.
- Output: Implementation Plan with an accurate `Approval status:` line.

### 4.3 `develop-issue` (skill) — the full CLS to PRP loop

The phase doc's 13-step loop, made concrete as a sequence of the other seven
workflows and two direct-agent steps that have no separate top-level
workflow of their own (RGR, DOC, VAL are stages, not maintainer-facing entry
points per the required list):

| Step (phase doc) | Stage | Handled by | Agent(s) |
| ----------------- | ----- | ---------- | -------- |
| 1. inspect the issue or user request | CLS (start) | `analyze-issue` | implementation-planner (or the session directly for a small change) |
| 2. classify risk | CLS | `analyze-issue` | implementation-planner |
| 3. delegate repository investigation to a read-only analyst | INV | `analyze-issue` | repository-analyst (parallel for high-risk) |
| 4. create an evidence-backed plan | PLN | `plan-change` | implementation-planner |
| 5. pause for approval when required | APP | `plan-change` (stop) | Maintainer |
| 6. delegate one bounded implementation task | IMP | `implement-task`, looped per task, strictly sequential | feature-implementer |
| 7. run focused tests | VER | `implement-task` | test-engineer |
| 8. delegate independent review | REV | `review-tree` | architecture-reviewer (+ specialists per 5.2) |
| 9. fix accepted findings | COR | `implement-task` reused for the fix; original reviewer re-checks | feature-implementer + the same architecture-reviewer/specialist that raised the finding |
| 10. run regression and generated-output review | RGR | direct step inside `develop-issue` (no separate top-level workflow) | regression-reviewer |
| 11. review documentation impact | DOC | direct step inside `develop-issue` | documentation-reviewer |
| 12. run full repository checks | VAL | direct step inside `develop-issue` | test-engineer |
| 13. produce a PR-ready report | PRP | `/prepare-pr` | feature-implementer assembles |

Rules restated here because they are the loop's own non-negotiables (per the
phase doc, not new invention):

- "Do not use one general-purpose agent for the entire flow without
  independent review" — step 8's `review-tree` delegation is mandatory in the
  standard and high-risk profile even if every prior step went smoothly; the
  small profile still performs the diff-review form of step 8
  ([lifecycle 4.1](lifecycle.md#41-small-change-isolated-low-risk)).
- Steps 6-7 loop per bounded task from the approved plan, strictly
  sequentially — no two `implement-task` invocations run concurrently in the
  same working tree (phase doc Parallelism section;
  [execution-model.md section 11](../../.planning/agentic-sdlc/phases/execution-model.md)
  reserves worktree-parallel writes for Phase 9).
- If step 10 or 12 discovers a trigger the plan did not flag (e.g. an
  unexpected schema touch), `develop-issue` stops and re-enters `plan-change`
  for reclassification before continuing — upward reclassification is
  immediate and unilateral
  ([task-classification section 4](task-classification.md#4-reclassification-rules));
  it never continues past a newly discovered trigger silently.
- If step 12's full validation surfaces a failing deterministic check rather
  than a design/scope problem, `develop-issue` delegates to `fix-ci` rather
  than re-deriving the same diagnose-fix-verify procedure inline (reference,
  don't restate).

### 4.4 `implement-task` (skill) — IMP + VER, and reused for COR

- Entry: a dispatchable Implementation Handoff exists per
  [handoff-contract section 5](handoff-contract.md#5-entry-and-exit-criteria)
  — one bounded task, its file set named and marked canonical/generated, its
  approval recorded if the task carries a trigger.
- Steps: (1) delegate to `feature-implementer` with the handoff verbatim; (2)
  delegate to `test-engineer` for the task's named focused verification,
  including `npx agentquilt check` whenever the task touched fragments,
  manifests, config, or generated files
  ([validation-evidence section 4](validation-evidence.md#4-validation-levels));
  (3) assemble the Return Handoff
  ([format](handoff-contract.md#4-artifact-format-return-handoff-implementer-to-reviewer)).
- Reused for COR: when `review-tree` returns BLOCKER/HIGH findings, the same
  skill dispatches the fix as a bounded correction task to
  `feature-implementer`, then the *original* reviewing agent (not a new one)
  re-checks using the finding's proposed verification method
  ([review-contract section 6](review-contract.md#6-correction-loop)).
- Never: starts without a handoff; expands scope beyond the handoff's
  allowed file set (goes back to `plan-change`); hand-edits a generated file
  (fragment edits are followed by `npx agentquilt build` inside the same
  task, per the handoff's rebuild flag).

### 4.5 `review-tree` (skill) — REV (+ conditional specialists)

- Entry: bounded tasks implemented and focus-verified (standard/high-risk),
  or a final diff ready for the small-profile diff review.
- Steps: (1) delegate to `architecture-reviewer` for the independent review
  ([checklist](review-contract.md#4-agentquilt-specific-review-checklist));
  (2) delegate in parallel to whichever specialists
  [agent-portfolio.md section 5.2](agent-portfolio.md#52-by-task-type-typical-classification-and-specialist-routing)
  names for the touched areas (`security-review`, `schema-design`,
  `deterministic-output`, `eval-designer`, `supply-chain-risk`,
  `ambiguity-detector` if a plan's done-criteria issue surfaces here); (3)
  merge all findings into one Review Findings artifact
  ([format](review-contract.md#52-finding-format)) with one summary table.
- Never: fixes anything itself; approves; reviews work the same session
  implemented without having spawned an independent reviewing agent instance
  for it.

### 4.6 `fix-ci` (skill) — ad hoc red-CI / red-check correction

- Trigger: a maintainer reports (or the session observes) a failing
  deterministic check on an existing branch/PR — distinct from `develop-issue`
  step 9's correction loop, which fixes *review findings*, not check
  failures; the two share mechanics (delegate the fix to
  `feature-implementer`, re-verify via `test-engineer`) but have different
  entry evidence (a failing command's output vs. a Review Findings artifact).
- Steps: (1) read the failing command's exact output (build error, test
  failure, coverage shortfall, or `npx agentquilt check` drift); (2) if the
  cause is unclear, delegate to `repository-analyst` for a bounded
  investigation of just that failure; (3) delegate the fix to
  `feature-implementer` as a bounded task; (4) delegate to `test-engineer` to
  re-run the authoritative command that failed plus anything it covers; (5)
  if the fix touches a previously unflagged trigger area (for example, the
  failure traces to a schema mismatch), stop and re-enter `plan-change`
  rather than patching past a reclassification event.
- Never: silently updates a fixture or baseline to make the failure go away
  — an unexplained fixture/baseline diff is a BLOCKER regardless of which
  workflow produced it
  ([risk-and-approval-policy section 6](risk-and-approval-policy.md#6-baseline-and-snapshot-changes)).

### 4.7 `/prepare-pr` (command) — PRP

- Argument: none required (operates on the current branch's accumulated
  session artifacts); optional issue/PR reference.
- Steps: (1) gather the Task Classification, Implementation Plan +
  approval reference, Review Findings + resolutions, and Validation Evidence
  already produced this session; (2) delegate to `feature-implementer` to
  assemble the PR Summary
  ([format](completion-contract.md#3-artifact-format-pr-summary)); (3) print
  the summary text for the maintainer to use.
- Never: runs `git push`, `gh pr create`, or any merge/publish action itself
  — those remain explicit, separate actions the Maintainer performs (or
  explicitly instructs outside this command), per
  [risk-and-approval-policy section 2](risk-and-approval-policy.md#2-absolute-rules-no-exceptions-any-profile)
  rule 1 ("no agent... pushes"). See decision D7.

### 4.8 `/release-readiness` (command) — REL

- Argument: none required (operates on `main`'s current state); optional
  proposed version bump type for the semver check.
- Steps: (1) delegate to `release-reviewer` to assemble the Release-Readiness
  Summary
  ([format](completion-contract.md#4-artifact-format-release-readiness-summary)),
  consuming CHANGELOG.md, `packages/agentquilt-cli/package.json` version,
  `policies/risks/risk-register.yaml`, and the most recent Validation
  Evidence; (2) print the verdict (READY or NOT READY with blockers named).
- Never: bumps the version, tags, or publishes — those are the Maintainer's
  steps per [release-process.md](../sdlc/release-process.md), listed in the
  summary's own "Remaining human steps" line
  ([format](completion-contract.md#4-artifact-format-release-readiness-summary)).

## 5. Parallelism

Only read-only, non-overlapping work runs in parallel, per the phase doc's
Parallelism section and
[execution-model.md section 11](../../.planning/agentic-sdlc/phases/execution-model.md#11-worktree-and-concurrency-rules):

- `analyze-issue` may spawn multiple `repository-analyst` instances in one
  batch of Agent-tool calls when the profile is high-risk and the
  investigation has genuinely disjoint questions (for example, "map the
  schema impact" and "map the CLI compatibility impact" as separate
  instances); `plan-change`'s `implementation-planner` merges their artifacts
  and owns conflict resolution, per
  [investigation-contract rule 7](investigation-contract.md#2-rules).
- `review-tree`'s specialist fan-out (4.5 step 2) is parallel read-only work
  by design — none of `security-review`, `schema-design`,
  `deterministic-output`, `eval-designer`, `supply-chain-risk` write.
- Nothing in this design uses worktree isolation (`isolation: "worktree"`);
  that remains reserved for Phase 9. `implement-task` invocations inside
  `develop-issue`'s loop are always sequential, one bounded task at a time,
  in the single working tree — the phase doc's explicit "keep implementation
  sequential until Phase 9" rule.
- No dynamic workflow or agent-team construct is introduced. The "team" is
  the fixed 14-agent roster invoked one at a time (or in disjoint read-only
  parallel batches) by a human-supervised session; nothing here is a new
  orchestrator (banned by ADR-0012 point 1 and the master prompt).

## 6. Segment 2 file layout (not created this segment)

All paths below are additions only; nothing under `.agentquilt/`,
`.claude/agents/`, or a generated file (`AGENTS.md`, `CLAUDE.md`,
`.claude/agents/*.md`, `agentquilt.lock`) is touched by this phase.

```
.claude/skills/analyze-issue/SKILL.md
.claude/skills/plan-change/SKILL.md
.claude/skills/develop-issue/SKILL.md
.claude/skills/implement-task/SKILL.md
.claude/skills/review-tree/SKILL.md
.claude/skills/fix-ci/SKILL.md
.claude/commands/prepare-pr.md
.claude/commands/release-readiness.md
.claude/settings.json          (modified: add a permissions.deny block, section 8)
```

Each `SKILL.md` carries YAML frontmatter `name` and a trigger-bearing
`description` (matching the style of this environment's own global skills,
for example `code-review`'s or `security-review`'s description shape) plus
the body content designed in section 4. Each command file carries
`description` and an `argument-hint` in frontmatter, matching the convention
observed in installed plugin commands (for example `ralph-loop`'s
`argument-hint: "PROMPT [--max-iterations N] ..."`). These are hand-authored,
unmanaged files (decision D2) — not compiled by AgentQuilt, not
drift-checked by `agentquilt check`, and not subject to the compiler's
fragment/manifest format. They are reviewed and versioned as ordinary
repository files, the same way `CONTRIBUTING.md` or `policies/gates/*.yaml`
are.

## 7. What is NOT built (explicit non-goals)

- No Codex assets (`.codex/`) — Phase 5.
- No change to any of the 14 `.agentquilt/agents/<name>/` sources or their
  compiled `.claude/agents/*.md` outputs. Skills/commands reference those 14
  agents by the `name:` value already in their frontmatter; nothing here
  renames or re-scopes a Phase 3 role. The agent-portfolio.md role
  contracts already state each role's contract; skills/commands cite them by
  anchor.
- No per-subagent Bash command allowlisting (Phase 3's D2 residual risk:
  `repository-analyst`, `regression-reviewer`, `deterministic-output`, and
  `supply-chain-risk` still carry a broad `Bash` grant restricted only by
  body text). A global `.claude/settings.json` permission rule applies
  uniformly to every caller in a session (main session and every subagent
  alike) and cannot express "only when repository-analyst is the active
  caller" without subagent-identity-aware hook logic whose reliability in
  Claude Code 2.1.193 is unverified. Attempting that now would be exactly
  the kind of first-of-its-kind, uncertain-shape hook the execution model
  asks an executor to gate on rather than guess at (decision D5, section 9).
  This remains explicitly Phase 6's job, as Phase 3 already flagged.
- No dynamic workflow/agent-team construct (section 5).
- No change to `.github/workflows/*.yml` (Phase 7 scope, per the Phase 2/3
  reports).

## 8. Provider-level guardrails: settings and permission rules

### 8.1 Principle: native rule before hook

[ADR-0012 point 7](../architecture/adr/ADR-0012-provider-native-agentic-sdlc-boundary.md)
permits an executable hook only "when a provider requires a command handler,
no native rule or existing repository command suffices... and its necessity
is documented." Both target behaviors this phase can concretely improve on
Phase 3 — "generated files are not intentionally edited" and the absolute
rules in
[risk-and-approval-policy section 2](risk-and-approval-policy.md#2-absolute-rules-no-exceptions-any-profile)
(no agent pushes, tags, publishes, or merges) — are static path/command
matches with no conditional logic, exactly what a declarative
`permissions.deny` rule expresses without a script. This design therefore
proposes **no hook script** for Phase 4; hooks stay available for Phase 6 if
guardrail work there turns out to need real conditional logic (for example,
subagent-identity-aware Bash scoping) that a plain permission pattern cannot
express.

### 8.2 Proposed `.claude/settings.json` addition

```json
{
  "permissions": {
    "deny": [
      "Write(AGENTS.md)",
      "Edit(AGENTS.md)",
      "Write(CLAUDE.md)",
      "Edit(CLAUDE.md)",
      "Write(.claude/agents/**)",
      "Edit(.claude/agents/**)",
      "Write(agentquilt.lock)",
      "Edit(agentquilt.lock)",
      "Bash(git push*)",
      "Bash(git tag*)",
      "Bash(npm publish*)",
      "Bash(npm version*)",
      "Bash(gh pr merge*)",
      "Bash(gh release*)"
    ]
  }
}
```

Rationale per rule group:

- The four `Write`/`Edit` pairs on `AGENTS.md`, `CLAUDE.md`,
  `.claude/agents/**`, and `agentquilt.lock` are the exact generated-file set
  named throughout the lifecycle contracts
  ([lifecycle rule 2](lifecycle.md#2-governing-rules-apply-to-every-stage);
  [review-contract checklist item 1](review-contract.md#4-agentquilt-specific-review-checklist)).
  This is a deliberate, intentional deny — the master prompt's own worked
  example ("you may not edit AGENTS.md directly") — not a session-blocking
  accident; it fires only on an attempt to write these specific paths, never
  on ordinary work.
- `git push`, `git tag`, `npm publish`, `npm version`, `gh pr merge`, and
  `gh release` are exactly the actions
  [risk-and-approval-policy section 2](risk-and-approval-policy.md#2-absolute-rules-no-exceptions-any-profile)
  says no agent performs, ever, in any profile. Denying them at the
  permission layer turns a documented rule into one the harness itself
  enforces, for every skill/command in this design and for the main session
  alike.

### 8.3 What is deliberately left alone

Destructive-but-sometimes-legitimate operations (`rm -rf`, `git reset --hard`,
`git checkout -- .` / `git restore .`, `git clean -f`, `git branch -D`,
history rewrites) are not added to any new rule here. Claude Code's default
behavior already prompts for confirmation before running a Bash command that
is not on an `allow` list in the *committed* project settings — and this
phase adds no such committed allow entries for these patterns — so the
existing default already satisfies risk-and-approval-policy rule 2's "prior
recorded human approval of the specific operation" without a new rule. Adding
an explicit `ask`-tier rule (if the installed version supports a third
`permissions.ask` list distinct from `allow`/`deny`) would only be
strengthening an already-satisfied behavior and needs the existence of that
tier confirmed first (section 9, decision D4).

### 8.4 Flagged, not fixed: local settings risk

`.claude/settings.local.json` (personal, gitignored, not part of this
phase's committed changes) already contains broad prefix allows accumulated
from earlier debugging sessions (`Bash(git checkout *)`, `Bash(git branch
*)`, `Bash(git merge *)`, `Bash(bash *)`, `Bash(npm install *)`, and others
listed in section 2). Claude Code's documented precedence model has
project-level `deny` win over any `allow` regardless of source, which would
mean the section 8.2 rules hold even against this local file — but that
precedence is exactly the kind of syntax/behavior fact section 9 asks
segment 2 to confirm before relying on it. Recorded here as a risk for the
Maintainer's awareness; not corrected by this phase (the file is personal
and not part of the change).

## 9. Decision points for the Maintainer (gate)

This phase stops here, before any file under `.claude/skills/`,
`.claude/commands/`, or `.claude/settings.json` is created or modified.
Approving the recommended option on every point below approves exactly the
design in sections 3-8; segment 2 executes it verbatim plus the syntax
checks named as prerequisites.

- **D1 — Skill vs. command split (section 3).** 6 skills
  (`analyze-issue`, `plan-change`, `develop-issue`, `implement-task`,
  `review-tree`, `fix-ci`) + 2 commands (`/prepare-pr`,
  `/release-readiness`). Genuine judgment call on `develop-issue`
  specifically: as a skill it can be pulled in by description match (for
  example, if a maintainer just says "work this issue end to end") as well
  as invoked by name; as a command it would only ever start on an explicit
  `/develop-issue <ref>`. Recommendation: skill, because every internal stop
  (APP, reclassification, COR escalation) already halts delegation and waits
  for the Maintainer regardless of how the workflow started, so auto-trigger
  carries no more risk than the loop already carries by design. Alternative:
  make it a command for a stricter "always deliberately started" guarantee.
- **D2 — Skill/command source location (section 2, section 6).**
  Hand-author directly at the native `.claude/skills/`/`.claude/commands/`
  locations, unmanaged by AgentQuilt, rather than authoring through
  `.agentquilt/skills/` and the `agentskills` adapter (confirmed by adapter
  source to target the separate, vendor-neutral `.agents/skills/` path with
  no established Claude Code discovery in this repository).
  Recommendation: hand-authored native location, as specified. Alternative
  (not recommended): compile through `.agentquilt/skills/` for portfolio
  consistency with Phase 3's dev-agent treatment — rejected because it risks
  the "skills trigger correctly" acceptance bullet on an unconfirmed
  discovery path for no compensating benefit.
- **D3 — Generated-file and absolute-rule guardrail mechanism (section 8.1,
  8.2).** `permissions.deny` rules in the committed `.claude/settings.json`,
  no hook script, per the ADR-0012 point 7 necessity bar. Recommendation:
  approve as specified, pending the segment-2 syntax check named in this
  section's prerequisites. Alternative: a PreToolUse hook script instead, if
  segment 2's syntax check finds that `permissions.deny` cannot match
  `Edit`/`Write` by file path in the installed version (the hook would then
  be justified under ADR-0012 point 7's "no native rule... suffices" clause).
- **D4 — Destructive-operation guard (section 8.3).** Rely on Claude Code's
  existing default confirm-before-run behavior (no new rule) rather than
  adding explicit rules for `rm -rf`/`reset --hard`/etc. Recommendation:
  approve as specified. Alternative: add explicit `permissions.ask` entries
  for these patterns once segment 2 confirms the installed version has an
  `ask` tier distinct from `allow`/`deny`.
- **D5 — Per-subagent Bash scoping (section 7).** Out of scope for Phase 4;
  remains Phase 6, unchanged from the risk Phase 3 already flagged.
  Recommendation: approve as out of scope. Alternative: attempt a
  subagent-identity-aware hook now — not recommended without first
  confirming Claude Code 2.1.193 exposes reliable subagent identity to a
  PreToolUse hook, which this segment did not verify.
- **D6 — `develop-issue`'s internal composition style (section 4.3).**
  Reference the other five skills by name at each stage (matching
  handoff-contract's "reference, don't restate" rule) rather than inlining
  each stage's full procedure. Recommendation: approve as specified, with
  segment 2 confirming skill-to-skill invocation behaves reliably in
  2.1.193; if not, the fallback is inlining the steps directly in
  `develop-issue` without changing the routing table in section 4.3.
- **D7 — `/prepare-pr`'s boundary (section 4.7).** The command assembles and
  prints the PR Summary text only; it never runs `git push` or
  `gh pr create` itself. Recommendation: approve as the plain reading of
  risk-and-approval-policy absolute rule 1, which is unconditional (not
  "asks before pushing"). Alternative (not recommended): let the command
  offer to run `gh pr create` after a fresh confirmation each time — rejected
  because the underlying rule this command's *future* runtime behavior must
  honor is permanent pipeline policy, not just this phase's own
  "no push, no PR" execution constraint.

## 10. Validation plan (segment 2, after approval and build)

Mapped to the phase doc's own "Validate:" bullets — all of these are manual,
human-supervised Claude Code session checks, never a CI step, consistent
with ADR-0012 point 4:

| Phase doc validation bullet | How segment 2 checks it |
| ---------------------------- | ------------------------ |
| Claude loads project instructions | Already true (CLAUDE.md exists, compiled); unaffected by this phase |
| core agents are discoverable | Already true (Phase 3); confirm the 6 skills/2 commands don't shadow or rename any of the 14 |
| skills trigger correctly | Open a fresh Claude Code session in this repo, invoke each skill/command by name once, confirm it loads and states its purpose correctly |
| read-only agents do not edit | Already enforced by each agent's `tools:` frontmatter (Phase 3); confirm a review-only skill (`review-tree`) never calls Edit/Write regardless of what its delegated agents attempt |
| the implementer observes plan and approval requirements | Run a representative standard-profile task through `develop-issue` and confirm it stops at `plan-change`'s gate before any `implement-task` call |
| generated files are not intentionally edited | Attempt (in a disposable branch) to have a skill edit `CLAUDE.md` directly; confirm the section 8.2 deny rule blocks it with a clear reason, not a silent failure |
| a representative small task completes through the full loop | Small-profile task: `analyze-issue` (light) -> `implement-task` -> focused tests -> `review-tree` diff review -> `/prepare-pr` |
| a representative medium task pauses at the correct human gate | Standard-profile task with a deliberately flagged trigger (for example, a fixture change) run through `develop-issue`; confirm it stops at `plan-change` and again names the trigger at `review-tree`/RGR if not already resolved |

## 11. Acceptance-criteria mapping

| Phase doc acceptance criterion | This design's answer |
| -------------------------------- | ---------------------- |
| A maintainer can start one Claude Code workflow and receive a complete, reviewable engineering result | `develop-issue` (or `/prepare-pr` at the end of a manually-run sequence) is that one entry point; section 4.3's table is the full traceable chain |
| No model API or SDK was added | Confirmed: no `package.json` change, no new dependency (section 7) |
| No AgentQuilt product feature was added | Confirmed: no `packages/agentquilt-cli/src/` change; D2 explicitly avoids routing through the product's `agentskills` adapter |
| Existing tests pass | Unaffected — this phase adds no code under test; `npm test` unchanged from Phase 3's baseline |
| Claude-specific configuration is documented | This document, plus the segment-2 skill/command files' own self-contained frontmatter and bodies |
