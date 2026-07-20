# Agentic SDLC -- Controlled Multi-Agent Parallelism (Design)

Date: 2026-07-13
Status: Approved (Phase 9 segment 1 design; Maintainer approved D1-D8 all
exactly as recommended, no amendments, 2026-07-13). This segment (segment 2)
finalizes the document against the approved decisions and commits it; no
tooling was built, no fan-out was run, and no live representative task was
performed by this segment -- the orchestrator runs the section 8
representative task (the acceptance-criteria proof/exercise of this
contract) separately, outside this segment's own scope. Write-parallelism
(section 6) is authorized-but-not-yet-exercised per D7: the mechanism is
final, but no live trial is scheduled inside Phase 9.
Companion documents: [handoff-contract.md](handoff-contract.md) (rule 5,
the exact clause this document resolves: "Parallel handoffs are limited to
high-risk read-only investigation until Phase 9 defines the wider
coordination contract"), [investigation-contract.md](investigation-contract.md)
(rule 7, the existing high-risk parallel-investigation allowance this
contract extends, not replaces), [review-contract.md](review-contract.md)
(the finding format every parallel reviewer's output must already use),
[completion-contract.md](completion-contract.md) (the PR Summary and
Release-Readiness Summary formats a parallel fan-out's synthesis ultimately
feeds), [agent-portfolio.md](agent-portfolio.md) section 5 (the routing
matrix naming which roles already run in parallel today: high-risk
repository-analyst instances, review-tree's specialist fan-out),
[claude-code-pipeline.md](claude-code-pipeline.md) section 5 and
[codex-pipeline.md](codex-pipeline.md) section 8 (both phases' own
"Parallelism" sections, both of which explicitly defer worktree-parallel
writes to this phase), [guardrails-design.md](guardrails-design.md) (Phase
6 -- the tool-call-layer guardrails a parallel subagent still operates
under, unchanged by this design), [evaluations-and-benchmarks.md](evaluations-and-benchmarks.md)
(Phase 8 -- the rubric/scenario-pack vocabulary this design's verification
step reuses rather than inventing a second one), [execution-model.md](../../.planning/agentic-sdlc/phases/execution-model.md)
(section 11, the standing worktree/concurrency rule this document is
authorized to extend for Phase 9 specifically, and the orchestrator/executor
pattern this document's coordination contract must also work for).

## 1. Purpose and scope

Phase 9 asks whether this effort's own orchestrator/executor pattern, and
this repository's real day-to-day development, can safely go faster on
large tasks by using provider-native multi-agent capabilities -- without
inventing a scheduler, without weakening review, and without allowing two
writers to touch the same file at once. This design produces the
coordination contract the phase doc requires, proposes a concrete large
representative task to prove it against, and treats parallel writes as a
capability this design documents precisely but does not yet exercise,
because this repository has zero precedent runs of write-parallelism and
the phase doc's own conditions for it are strict enough that they deserve a
first real trial before being declared routine.

Binding constraints carried over from the master prompt, the phase doc, and
`execution-model.md` sections 10-11, not repeated at each section below:
development infrastructure only, no AgentQuilt product feature, no custom
scheduler/runtime/orchestration script, provider-native mechanisms only
(Claude Code's `Agent` tool with `isolation`, `SendMessage`, background
execution; Codex's native subagents/project agents/configured concurrency/
native isolation), human approval remains required at every existing gate,
plain ASCII text throughout (`--` not an em dash), local only (no push, no
PR, no publish).

## 2. Current-state findings

Verified 2026-07-13 against the working tree on
`refactor/agentic-sdlc-boundary-cleanup`.

### 2.1 How the orchestrator/executor pattern has actually run, Phases 0-8

- **One executor at a time, every phase, no exceptions.** `git log
  --oneline` and the nine existing phase reports (`outputs/phase-00-report.md`
  through `outputs/phase-08-report.md`) show a strictly sequential history:
  each phase's executor is spawned by the orchestrator, runs to completion
  or a gate, returns a report, and the orchestrator either resumes the same
  executor via `SendMessage` (when its context is still valuable -- the
  documented mechanism in `execution-model.md` section 7 step 3) or spawns a
  fresh executor for the next segment. `isolation: "worktree"` has never
  been passed to the `Agent` tool call that spawns a Phase Executor, in any
  phase to date -- confirmed by this being explicitly stated as known
  context for this task, and consistent with `execution-model.md` section
  11's own "Default: one executor at a time, working in the main worktree"
  rule, which every phase's segment log is consistent with (each report's
  own segment-log entries describe one executor's sequential turns, never
  two executors' interleaved output).
- **Multi-segment phases (1, 3, 4, 5, 6, 7, 8) all used the same pattern**:
  a design-only segment 1 that stops at a gate, a Maintainer decision, then
  a build segment 2 (occasionally segment 3) that either resumes the same
  executor or starts fresh with the interim report and the gate decision
  quoted verbatim, per section 7's segment protocol. No phase to date has
  run two Phase Executors concurrently against the same or different files.
- **Read-only helper fan-out already happens today, inside a single
  phase's own investigation work, without worktree isolation** -- this is
  the load-bearing precedent this design extends, not a new idea. Three
  concrete instances already exist in the committed contracts, not merely
  proposed:
  1. `investigation-contract.md` rule 7: "multiple read-only analysts may
     investigate disjoint question sets; the planner merges their artifacts
     and owns conflict resolution between them" (high-risk profile only).
  2. `agent-portfolio.md` section 5.1's high-risk row: "parallel
     repository-analyst instances at INV (disjoint questions)."
  3. `review-tree`'s specialist fan-out (Claude Code:
     `claude-code-pipeline.md` section 4.5 step 2; Codex:
     `codex-pipeline.md` section 5.1) -- multiple read-only specialist
     reviewers (`security-review`, `schema-design`, `deterministic-output`,
     `eval-designer`, `supply-chain-risk`, `ambiguity-detector`) run against
     the same diff in parallel, since none of them write.
  All three are read-only fan-out inside one phase/session's own turn, not
  cross-phase parallelism and not worktree isolation -- they establish the
  pattern this design's read-heavy contract (section 4) formalizes for the
  orchestrator's own use, they do not yet establish a write-parallelism
  precedent.
- **`handoff-contract.md` rule 5 is the explicit, load-bearing forward
  reference this document resolves**: "Sequential by default. Parallel
  handoffs are limited to high-risk read-only investigation until Phase 9
  defines the wider coordination contract." This sentence was written at
  Phase 2 and has stood unresolved through Phases 3-8; this design is its
  resolution, not a new policy invented independently of it.
- **Both provider pipeline designs explicitly deferred worktree-parallel
  writes to this phase, by name**: `claude-code-pipeline.md` section 4.3's
  `develop-issue` design states its implementation loop is "strictly
  sequential... reserves worktree-parallel writes for Phase 9";
  `codex-pipeline.md` section 8 states "Nothing in this design uses
  worktree isolation; that remains reserved for Phase 9, unchanged from
  Phase 4's own note." Neither phase built or exercised any worktree
  mechanism -- this design is the first to actually specify one.

### 2.2 What in this repository's own remaining work would plausibly benefit from read-heavy parallelization

Surveyed against this effort's own remaining phases and against ordinary
day-to-day AgentQuilt development, distinguishing genuine candidates from
work too small to be worth the fan-out overhead:

- **Phase 10 itself** (pilot tuning and operating model) will need to read
  and cross-reference every prior phase's deliverable -- 8 pipeline/
  contract documents under `.docs/agentic-sdlc/`, 5 gate policies, the risk
  register, the eval scenario pack -- to assess what is actually working.
  This is a textbook disjoint-question read-heavy fan-out: "what does the
  Claude Code pipeline actually cover," "what does the Codex pipeline
  actually cover," "what do the eval results show once populated," "what do
  the CI/GitHub artifacts actually enforce" are four genuinely independent
  reading tasks over non-overlapping document sets.
- **A real, current gap this repository has on record**: Phase 8's own
  `evals/results/summary.md` currently shows 0 of 12 scenarios x 2
  providers run. When the Maintainer works through that checklist (an
  activity `evaluations-and-benchmarks.md` section 6.5 explicitly hands off
  as Maintainer-paced, outside the phase-executor loop), each individual
  live run is itself a serial, single-session activity by the runbook's own
  design (section 6.1: "a single-scenario, single-provider, human-initiated
  loop") -- not a candidate for this phase's fan-out, since the runbook
  already forbids batching it. However, *before* a scenario run starts,
  fixture-recipe verification (confirming a cited source anchor still
  exists, per `evaluations-and-benchmarks.md` section 8.2's own build-time
  practice) across several scenario fixture recipes at once is read-heavy
  and disjoint -- a plausible, real, small-scale use of this contract
  ahead of a batch of scenario runs, not fabricated for this document.
- **Package-by-package / area-by-area investigation for a genuinely large
  future product change** -- for example, if a future change touched the
  compiler core (`normalize.ts`, `fragmentScanner.ts`, `compiler.ts`), the
  adapter layer (`claude.ts`, `agentskills.ts`), and the CLI command layer
  (`src/commands/`) simultaneously, `analyze-issue`'s own investigation
  step could fan out one read-only investigator per area rather than one
  investigator reading all three serially -- this is the phase doc's own
  named example ("package-by-package investigation") and this repository's
  actual `packages/agentquilt-cli/src/` layout already has this shape
  (`core/`, `core/adapters/`, `commands/`, `schemas/`).
- **Documentation impact analysis across a wide-reaching change** -- a
  change touching `.docs/architecture/`, `.docs/sdlc/`, `.docs/stlc/`, and
  the `.agentquilt/agents/project/` fragments simultaneously is exactly the
  `documentation-reviewer` role's job today, done serially; splitting it
  into independent per-directory read passes is a direct, low-risk
  application of this design's read-heavy contract.
- **What is NOT a good fit, named explicitly rather than left implicit**:
  small-profile tasks (per the phase doc's own acceptance criterion,
  "sequential mode remains the default for small work" -- fan-out overhead
  exceeds the benefit for a one-function bug fix); any task whose read-heavy
  work is already fast enough serially that spawning, tracking, and
  synthesizing multiple agents costs more wall-clock and review attention
  than doing it in one pass (a two-file investigation does not need three
  parallel readers).

### 2.3 Existing contracts this coordination contract must interoperate with, not compete with

- **`investigation-contract.md`** already defines the Repository
  Investigation artifact format (section 4) and rule 7's parallel-analyst
  allowance. This design's subagent output format (section 5.4 below) does
  not invent a second investigation format -- a parallel read-only
  investigator's output IS a Repository Investigation (or a bounded
  fragment of one, scoped to its assigned disjoint question set), produced
  in the exact section 4 format, merged by the parent exactly as rule 7
  already specifies ("the planner merges their artifacts and owns conflict
  resolution").
- **`review-contract.md`** already defines the Review Findings format
  (section 5.2) and the severity ladder. A parallel specialist reviewer's
  output (already happening today per `review-tree`'s fan-out) IS a Review
  Findings artifact in that exact format -- this design's contract does not
  add a second findings format for the write-parallelism case either; a
  parallel implementer's Return Handoff (`handoff-contract.md` section 4)
  remains the Return Handoff format unchanged.
- **`completion-contract.md`** already defines the PR Summary. This
  design's "final synthesis requirements" (section 5.9) route into that
  same artifact -- a fan-out's synthesized result is not a new artifact
  type sitting alongside the PR Summary, it is evidence that feeds one, per
  `handoff-contract.md`'s existing "reference, don't restate" rule.
- **`agent-portfolio.md`'s role contracts** are unchanged by this design.
  No new agent is created; no existing agent's read-only/write-capable
  status changes. Running `repository-analyst` in parallel N times is still
  `repository-analyst` doing INV work N times over disjoint questions, not
  a new role.
- **`evaluations-and-benchmarks.md`'s rubric and scenario pack** (Phase 8)
  are the verification vocabulary this design's "parent must verify before
  accepting" step (section 5.7) reuses: a parallel subagent's investigation
  output is checked the same way any investigation is checked today
  (dimension 2, "repository evidence quality," and dimension 5, "correct
  source-file selection," from Phase 8's 14-dimension rubric) rather than
  this design inventing a separate parallel-specific verification
  checklist.

## 3. Provider-specific mechanics

### 3.1 Claude Code -- confirmed, this session's own available tools

Confirmed directly in this session (the Phase 9 executor is itself a Claude
Code subagent with these exact tools available, not a description read
secondhand):

- **`Agent` tool, `isolation` parameter**: accepts `"worktree"` (creates a
  temporary git worktree so the spawned agent works on an isolated copy of
  the repository; the worktree is automatically cleaned up if the agent
  makes no changes, otherwise the path and branch are returned in the
  result) or `"remote"` (a remote cloud environment, always background).
  Omitting `isolation` runs the agent in the current working directory --
  this is what every Phase 0-8 executor spawn has used.
- **`run_in_background: true`** on the `Agent` tool call: runs the spawned
  agent without blocking the parent's turn; the parent is notified on
  completion rather than polling. Available independent of `isolation` --
  a background agent can run in the main worktree (read-only, non-blocking)
  or in an isolated worktree (background write-capable).
- **`SendMessage`**: resumes a previously spawned agent by name or
  `agentId`, preserving its context -- the exact mechanism
  `execution-model.md` section 7 step 3 already names for resuming a Phase
  Executor across a segment boundary. This design's read-heavy contract
  (section 4) does not need `SendMessage` (each read-only fan-out task
  completes and returns once); it remains available for the orchestrator's
  own existing segment-resumption use, unaffected by this design.
- **`EnterWorktree` / `ExitWorktree`**: session-level worktree tools
  distinct from the `Agent` tool's `isolation` parameter -- these switch
  the CURRENT session's own working directory into a worktree, rather than
  spawning an isolated subagent. Not the mechanism this design uses for
  fan-out (fan-out isolation is per-subagent via `Agent(isolation:
  "worktree")`, not a session-level switch), noted here only to disambiguate
  from the `Agent` tool's `isolation` parameter, which is what this design
  actually specifies.
- **`Monitor`**: streams events from a long-running background process; not
  needed for this design's read-heavy or write-parallel patterns (both
  complete in one bounded `Agent` call, not a long-running watched
  process), noted for completeness since it appears in this session's own
  available-tools context.
- **No dynamic workflow or agent-team construct exists as a distinct
  primitive** beyond `Agent` (with or without `isolation`/
  `run_in_background`) and `SendMessage` -- confirmed by this session's own
  tool list, matching Phase 4's own finding ("no dynamic workflow/agent-team
  construct," section 7.1 of `codex-pipeline.md`, restated for the Claude
  Code side in `claude-code-pipeline.md`'s own non-goals). This design's
  coordination contract is therefore built entirely from `Agent`,
  `isolation`, `run_in_background`, and `SendMessage` -- four native
  primitives, not a fifth invented one.

### 3.2 Codex -- confirmed from this repository's existing Phase 5 investigation

`codex-pipeline.md` section 2.4 and section 8 already establish the
relevant facts, not re-derived here:

- **Depth-1 delegation, prompt-recognized, not a closed-enum tool
  parameter**: a Codex session's model reads `.codex/agents/*.toml`
  `description` fields and decides to spawn a named custom agent when its
  own instructions or the user's request match. `agents.max_depth` (default
  `1`) caps recursion -- a spawned custom agent cannot itself spawn further
  descendants without a config change this repository does not make.
- **`review-tree`'s specialist fan-out is already parallel, already
  built** (`codex-pipeline.md` section 5.1, section 8): multiple read-only
  specialist agents run against the same diff, matching the Claude Code
  side exactly, because none of them write.
- **`analyze-issue`'s high-risk fan-out is already designed** (section 7,
  `codex-pipeline.md`): "`analyze-issue` may spawn multiple
  `repository-explorer` instances in one batch when the profile is
  high-risk and the investigation has genuinely disjoint questions;
  `plan-change`'s `implementation-planner` merges their artifacts" -- the
  Codex-side mirror of `investigation-contract.md` rule 7, already present
  in the approved Phase 5 design, unbuilt only in the sense that
  `.codex/agents/*.toml` files themselves are still segment-2 work per
  Phase 5's own gate status.
- **`codex exec` provides a genuine non-interactive concurrency path Claude
  Code's design does not have an equivalent for** (`codex-pipeline.md`
  section 2.7, section 7.1's last bullet): a Maintainer can run multiple
  `codex exec` invocations in separate terminal sessions or a simple shell
  loop the Maintainer types and controls directly, each a fully independent
  Codex process with its own sandbox. This is "configured concurrency" in
  the phase doc's own Codex-mechanics wording -- native, not a scheduler
  this design would need to build, since it is just N independent terminal
  invocations a human starts, not an automated loop.
- **No repository-wide worktree-isolation feature is documented for Codex
  in this repository's existing Codex investigation** beyond the sandbox/
  permission-profile system (`:read-only`, `:workspace`,
  `:danger-full-access`) already covered by Phase 5 section 2.2 -- a
  Codex-side write-parallelism equivalent to Claude Code's `Agent(isolation:
  "worktree")` would rely on the Maintainer manually creating separate git
  worktrees and running independent `codex exec`/interactive sessions
  inside each, which is native (ordinary `git worktree add` plus Codex
  running normally inside each resulting directory) but not a single
  built-in Codex primitive the way Claude Code's `isolation` parameter is
  one tool argument. This asymmetry is real and stated plainly, not
  smoothed over: Claude Code's worktree isolation is a first-class tool
  parameter; Codex's equivalent is standard `git worktree` plus independent
  Codex sessions, achieving the same isolation property through a
  provider-agnostic Git mechanism rather than a Codex-specific feature.

### 3.3 No custom scheduler -- explicit confirmation

This design proposes no new script, service, wrapper, or orchestration
layer. Every mechanism named in sections 3.1-3.2 is a native tool call or
native CLI invocation:

- Claude Code: `Agent` tool calls (with or without `isolation`/
  `run_in_background`), `SendMessage`, ordinary `git worktree` commands run
  via `Bash` when a human or the orchestrator needs to inspect a worktree
  the `Agent` tool created.
- Codex: prompt-recognized custom-agent delegation, `codex exec` as
  independent terminal invocations, ordinary `git worktree add`/`git
  worktree remove` for the write-parallel case.

Nothing under `packages/agentquilt-cli/src/`, no new `package.json`
dependency, no new file under `scripts/`, and no GitHub Actions workflow is
proposed by this design. The coordination contract (section 5) is a set of
rules for how the orchestrator (or a Maintainer driving Codex directly)
uses these existing primitives, not a program that executes those rules
for them.

## 4. Read-heavy parallelism -- the default mode this design actually authorizes for routine use

Consistent with section 2.2's survey and the phase doc's acceptance
criterion "sequential mode remains the default for small work," read-heavy
fan-out is this design's primary, immediately-usable deliverable. It
requires no new precedent-setting decision beyond formalizing what
`investigation-contract.md` rule 7 and `review-tree`'s fan-out already
permit, extended to the orchestrator's own use for its own future
read-heavy work (Phase 10 investigation, the fixture-recipe-verification
example in section 2.2, or ordinary day-to-day AgentQuilt development).

## 5. The coordination contract

This section is written to be followed verbatim by the orchestrator the
next time it fans out read-heavy work, or by a Maintainer directing Codex
to do the same. Every element the phase doc's "Coordination contract"
section requires is covered below, in the order the phase doc lists them.

### 5.1 Maximum concurrency

**Rule: at most 4 concurrent subagents per fan-out, chosen per-task from
the number of genuinely disjoint questions, never padded to hit the
ceiling.**

Reasoning: this is a repository-fit number, not an arbitrary round figure.
Every read-heavy precedent already in this repository's contracts is
small-N: `investigation-contract.md` rule 7 does not name a number but its
own worked context (a high-risk change with a handful of genuinely
independent question areas) implies single digits; `review-tree`'s
specialist fan-out has exactly 6 possible specialists and in practice only
the ones a given diff's triggers actually engage (`agent-portfolio.md`
section 5.2's routing table) run at once, typically 1-3 for a real change;
section 2.2's own concrete example (a compiler-core/adapter-layer/
CLI-command-layer investigation) is naturally 3-way. 4 is chosen as the
ceiling rather than an unbounded "as many as there are questions" rule for
two concrete reasons: (1) the parent (orchestrator or Maintainer) must read
and verify every subagent's output before accepting it (section 5.7) --
verification cost scales linearly with fan-out count, and beyond 4
simultaneous outputs a human reviewer's ability to actually read each one
carefully before synthesis degrades, which would violate the "parent must
not accept subagent output without verification" requirement in practice
even if not in the letter of a review step; (2) this repository's actual
task shapes (section 2.2) do not currently present a genuine need for more
than 4 disjoint read-heavy question sets in one fan-out -- a 5th "disjoint"
question at this repository's current size is more likely an artificially
split single question than a real independent one, and splitting too
finely creates synthesis overhead that erodes the "measurable benefit"
acceptance criterion.

Write-parallelism (section 6) uses a stricter number, defined there
separately, since its risk profile is different.

### 5.2 Parent-agent responsibilities

The parent (the orchestrator session, or a Maintainer-driven Codex session)
is responsible for, before, during, and after a fan-out:

**Before spawning:**

1. Confirm the work is genuinely read-heavy and the questions are
   genuinely disjoint (no two subagents would need to read-then-decide
   based on another subagent's still-in-progress finding). If questions
   are not disjoint, this is not a fan-out candidate -- run sequentially or
   redesign the question split first.
2. Confirm repository state is stable for the duration (no uncommitted
   changes about to land mid-fan-out that would invalidate an
   already-issued task assignment). If the working tree is dirty in an
   area a subagent will read, note this in the task assignment (section
   5.3) explicitly rather than let a subagent discover stale-vs-current
   ambiguity on its own.
3. Write one task assignment (section 5.3) per subagent before spawning
   any of them -- not improvised one at a time, so the full disjoint-set
   is visible up front and overlap is checkable before any agent starts.

**During:**

4. Do not accept a subagent's output until it returns; do not act on a
   partial or self-reported "I'm mostly done" status from a still-running
   subagent.
5. If a stopping-rule condition (section 7) is observed while subagents
   are still running, the parent may still let already-dispatched
   subagents finish (their read-only work causes no harm by finishing),
   but must not dispatch any further subagent in the same fan-out batch
   until the condition is resolved.

**After each subagent returns:**

6. Verify before accepting (section 5.7) -- every subagent's output,
   every time, no exceptions for a "trusted" or previously-reliable
   subagent type.
7. Detect conflicts between subagents' findings (section 5.6) before
   synthesis, not after.

**Synthesis:**

8. Produce one merged artifact per section 5.9, in the existing contract
   format the work-type already has (a Repository Investigation, a Review
   Findings table, or equivalent) -- never a new, parallel-specific report
   format sitting alongside the existing ones.

The parent never delegates verification itself to a subagent (a subagent
cannot verify its own sibling's output and call that independent
verification -- this would violate `review-contract.md` section 2's
"reviewer is never the implementer" principle applied one level up: the
parent reviewing fan-out output is itself acting in a reviewer-like
capacity and must do that work directly, not by asking another subagent to
do it on its behalf, since that subagent has no more standing to certify a
peer's investigation than the peer's own self-report would).

### 5.3 Task assignment format

One per subagent, written before any subagent in the batch is spawned:

```markdown
## Fan-out Task Assignment

- Batch: <short label, e.g. "Phase 10 pipeline cross-reference">
- Subagent: <N> of <total in this batch>
- Question: <one, genuinely disjoint from every sibling's question>
- Scope (read-only): <exact paths/directories this subagent may read;
  explicitly note any path a sibling is ALSO reading, if unavoidable, and
  why that overlap is safe for read-only work>
- Deliverable format: <the existing contract format this maps to --
  Repository Investigation section 4 / Review Findings section 5.2 /
  other named format>, or "free-form summary, <N> paragraphs max" for
  work with no existing artifact format
- Stop conditions specific to this task: <anything beyond the standing
  section 7 stopping rules>
- Do not: write any file; run any state-changing command; make any claim
  without a path/line/command citation (per investigation-contract.md
  rule 2)
```

Every task assignment in one batch is written and reviewed for
non-overlap (section 5.5) before the first `Agent` call is made.

### 5.4 Subagent output format

**Compatible with existing contracts, not a competing format.** A
read-heavy subagent's output is one of:

- A **Repository Investigation** (`investigation-contract.md` section 4),
  scoped to its assigned question set, when the fan-out is an
  investigation task. The subagent's findings table, affected-components
  table, and unknowns section cover only its assigned scope; the parent's
  synthesis (section 5.9) merges N scoped Repository Investigations into
  one, exactly as `investigation-contract.md` rule 7 already specifies.
- A **Review Findings** artifact (`review-contract.md` section 5.2), when
  the fan-out is a specialist or independent review task -- this is
  already the exact mechanism `review-tree`'s existing fan-out uses today,
  unchanged by this design.
- A **free-form scoped summary** (task assignment's "Deliverable format"
  field states the paragraph cap) only for read-heavy work with no
  existing artifact format in this repository's contracts (for example,
  section 2.2's "what does the Claude Code pipeline actually cover"
  cross-reference question, which is not itself an INV-stage investigation
  or a REV-stage review) -- every claim in a free-form summary still
  carries a path/line/command citation per the same evidence discipline
  `investigation-contract.md` rule 2 already requires, even outside that
  contract's own formal artifact.

No new report format is defined by this document. A subagent returning a
Markdown findings artifact is already producing something the next stage
in the lifecycle (planner, reviewer, or human) can consume without
translation.

### 5.5 Shared-file restrictions

**Mechanism: an explicit ownership manifest, written as part of the task
assignment batch (section 5.3), checked for zero overlap before any
subagent is spawned.**

Concretely: before dispatching a batch, the parent writes a single table
listing every path (or path glob) each subagent will read, and confirms no
write-capable subagent's scope overlaps another write-capable subagent's
scope. For read-only fan-out (section 4, the default mode), overlapping
READ scope between two subagents is explicitly permitted and safe (two
agents reading the same file concurrently causes no conflict) -- only
overlapping WRITE scope is restricted, which is why this manifest matters
primarily for section 6's write-parallelism case, but is written for every
batch (including read-only ones) so the discipline is uniform and the
manifest is trivial to produce for a read-only batch (an explicit "no
writes in this batch" line satisfies it).

```markdown
## Fan-out Ownership Manifest

- Batch: <same label as the task assignments>
- Mode: read-only | write-parallel

| Subagent | Paths read | Paths written (write-parallel only) |
| -------- | ---------- | ------------------------------------ |
| 1        | <paths>    | <paths, or "none -- read-only">      |
| 2        | <paths>    | <paths, or "none -- read-only">      |

- Overlap check: <explicit statement -- "no write-scope overlap" for
  write-parallel batches, or "read-only, overlap permitted" for read-heavy
  batches>
```

A write-parallel batch with any write-scope overlap does not proceed --
this is not a warning, it is a hard stop back to task redesign (split the
overlapping file's ownership to one subagent, or fold both subagents' work
into one sequential task).

### 5.6 Conflict-handling policy

Two distinct conflict types, handled differently, per the phase doc's own
stopping rule ("stop fan-out when... findings conflict"):

1. **Overlapping scope discovered before dispatch** (section 5.5's
   manifest check fails): task redesign, not an escalation -- the parent
   redraws the ownership manifest and either narrows one subagent's scope
   or merges the two overlapping tasks into one, before any subagent runs.
   No Maintainer involvement needed; this is ordinary task-design
   correction, the same category of fix a plan review already performs
   before dispatching any bounded task (`implementation-plan-contract.md`'s
   own bounded-task definition).
2. **Conflicting findings discovered after subagents return** (two
   subagents' Repository Investigations or Review Findings disagree about
   a fact -- for example, one reports a function is covered by an existing
   test and the other reports it is not): **the parent does not silently
   pick one and does not average them.** The parent's synthesis (section
   5.9) states the disagreement explicitly as an unresolved item, together
   with both subagents' cited evidence, and takes exactly one of two next
   steps depending on severity:
   - **Low-stakes disagreement** (does not change the task's
     classification, does not affect a gate trigger, does not block
     completion criteria): the parent re-derives the fact directly itself
     (a single, targeted read or command, faster than re-running a whole
     subagent) and records which subagent was right and why, in the
     synthesized artifact's own findings table -- this is the "parent
     re-runs" branch, appropriate because the disagreement is cheap to
     settle directly.
   - **High-stakes disagreement** (affects classification, a gate trigger,
     or a completion criterion -- for example, one subagent says a change
     is a persisted-format trigger and a sibling says it is not): fan-out
     for this batch stops immediately (per the phase doc's own stopping
     rule) and the disagreement, with both subagents' full evidence, is
     escalated to the Maintainer as an `open_questions` item in the phase
     report (or, outside a phase-executor context, surfaced directly to
     the Maintainer before proceeding) -- the parent does not adjudicate a
     genuinely load-bearing factual disagreement unilaterally, matching
     `review-contract.md` section 6 rule 3's existing precedent ("Disputes
     ... go to the Maintainer with both positions; agents do not overrule
     each other") applied to parallel investigators instead of a
     reviewer-vs-implementer dispute.

This is a documented-disagreement default, not a silent-pick default: even
the low-stakes branch records the disagreement and its resolution in the
synthesized artifact rather than quietly discarding the losing finding.

### 5.7 Verification before acceptance -- the concrete step

The phase doc states plainly: "the parent agent must not accept subagent
output without verification." This design's concrete mechanism, reusing
Phase 8's own rubric vocabulary rather than inventing a second one:

**For every subagent's output, before it is merged into the synthesis, the
parent performs a targeted spot-check against at least one claim in that
output**, chosen from the claims most load-bearing for whatever happens
next (a claimed file location, a claimed test-coverage fact, a claimed
absence of a trigger). Concretely:

1. Pick the single claim in the subagent's output that, if wrong, would
   most change the next stage's action (for an investigation: usually the
   canonical-vs-generated determination or the trigger-check answer, per
   `investigation-contract.md` rules 3 and 5; for a review: usually the
   most severe finding, per `review-contract.md`'s own severity ladder).
2. Re-derive that one claim directly (`Read` the cited path/line, or run
   the cited command) -- not the subagent's entire output, since
   re-verifying every claim would defeat the purpose of delegating the
   read in the first place; one targeted spot-check per subagent is the
   proportionate check, mirroring Phase 8's own dimension 2 ("repository
   evidence quality... cite specific files/lines/commands rather than
   assertion").
3. If the spot-check confirms the claim: accept the output into synthesis.
4. If the spot-check contradicts the claim: do not accept the output as-is.
   Either (a) the claim is simply wrong (a subagent misread something) --
   correct it in the synthesized artifact with a note, or (b) the
   discrepancy suggests the subagent's whole scoped investigation is
   unreliable (for example, it was working from a stale file read early in
   its own turn) -- re-dispatch that one subagent's task only, not the
   whole batch.

This spot-check is the same discipline `review-contract.md` section 5.2
already requires of every finding ("evidence, impact, proposed
verification") turned around: the parent performs the proposed
verification the subagent's own citation implies, rather than trusting the
citation exists without following it once.

### 5.8 Failure propagation

- A subagent that errors, times out, or returns clearly incomplete output:
  the parent does not silently drop it from the synthesis. The
  synthesized artifact names the gap explicitly ("subagent N's question
  was not answered due to <reason>; treated as an unknown, not a
  negative finding" -- per `investigation-contract.md`'s own "unresolved
  questions are recorded as unknowns, not guessed" rule 6) and the parent
  decides whether the gap is acceptable for the batch's purpose or
  requires a single re-dispatch of that one subagent's task (not the whole
  batch -- failure in one disjoint question does not invalidate siblings'
  already-verified output).
- A subagent that returns output touching a path outside its assigned
  scope (section 5.3's "Scope" field): this is itself a finding, not
  silently absorbed -- the parent notes it in the synthesis as a
  scope-discipline observation and, for read-only fan-out, this is a
  low-severity note (the subagent read something extra, which caused no
  harm since it is read-only); for a write-parallel subagent (section 6),
  any out-of-scope WRITE is treated as a hard failure of that subagent's
  task per section 6's own restricted-writes rules, is reverted, and
  triggers the correction-limit count in section 5.9's cancellation rules.

### 5.9 Cancellation rules

- The parent may cancel a still-running subagent at any point a stopping
  rule (section 7) is triggered by ANOTHER subagent in the same batch or
  by a repository-state change -- Claude Code's `Agent` tool supports this
  via `TaskStop` for a background-running agent; a foregrounded (blocking)
  `Agent` call cannot be cancelled mid-flight by construction (the parent's
  own turn is blocked waiting for it), which is itself a reason
  read-heavy fan-out defaults to `run_in_background: true` for batches of
  more than one subagent (section 5.1) -- a single foregrounded subagent
  needs no cancellation mechanism since the parent is already waiting
  synchronously for its one result.
- Cancelling a subagent that has made no writes (the default read-only
  case) requires no cleanup -- the agent simply stops.
- Cancelling a write-parallel subagent (section 6) requires the parent to
  check its assigned worktree for uncommitted changes before discarding it
  (Claude Code's `ExitWorktree` tool itself refuses to remove a worktree
  with uncommitted changes unless `discard_changes: true` is explicitly
  passed) -- the parent must inspect what would be discarded before
  passing that flag, never as an unconditional cleanup step.

### 5.10 Final synthesis requirements

- One merged artifact per batch, in the existing contract format the
  work-type already has (section 5.4) -- never N separate artifacts left
  for a human to reconcile themselves.
- Every finding in the merged artifact traces to which subagent produced
  it (a "source" column or inline citation), so a later reviewer can
  re-verify against the original subagent's specific claim if needed.
- Every conflict encountered (section 5.6) is stated explicitly in the
  synthesis, with its resolution or its escalation status -- a synthesis
  that silently drops a disagreement between two subagents has not met
  this requirement.
- The synthesis states, in one line, the actual measured benefit of having
  run this as a fan-out rather than sequentially (per the phase doc's own
  "parallel work produces measurable benefit" acceptance criterion) --
  wall-clock turns saved, or a qualitative note if turns are not
  comparable (for example, "4 disjoint areas covered in one round-trip
  instead of 4 sequential round-trips" is itself the measurable benefit
  for a read-heavy batch, independent of whether raw token/time numbers
  are available, mirroring Phase 8's own dimension 14 treatment of
  efficiency as "recorded as a note when available," never a required
  precise number).
- The synthesis is handed to whatever stage consumes it next (planner,
  reviewer, PR assembly) exactly as a single-agent-produced artifact of
  the same type would be -- the fact that it was produced by fan-out is
  visible in its provenance notes (previous bullet) but does not change
  its consumption contract.

## 6. Restricted parallel work -- parallel writes

### 6.1 The phase doc's own conditions, applied literally to this repository

The phase doc permits parallel implementation writes only when ALL of:
tasks are independently bounded; file ownership does not overlap; each
task has acceptance criteria; isolated worktrees or provider-native
isolation are available; integration order is defined; a final
reconciliation review is mandatory.

Every one of these six conditions is independently satisfiable in this
repository today:

- **Independently bounded tasks**: `implementation-plan-contract.md`'s
  existing bounded-task definition already requires this for every
  sequential task too -- write-parallelism adds no new bounding
  requirement, it just requires two-or-more already-bounded tasks whose
  bounds do not intersect.
- **Non-overlapping file ownership**: mechanically checkable via section
  5.5's ownership manifest, extended to require zero write-scope overlap
  (not just no overlap-and-it's-fine, as in the read-only case).
- **Acceptance criteria per task**: already a required field of every
  Implementation Handoff (`handoff-contract.md` section 3, "Done
  criteria").
- **Isolated worktrees available**: confirmed directly, section 3.1 --
  Claude Code's `Agent(isolation: "worktree")` is a first-class, already-
  available tool parameter in this very session.
- **Integration order defined**: section 6.3 below defines the required
  merge-order rule.
- **Mandatory final reconciliation review**: section 6.4 below defines it
  as a non-optional step, never skippable regardless of how clean each
  individual worktree's own diff looks in isolation.

### 6.2 Whether this design authorizes exercising write-parallelism now

**Resolved (D7, approved by the Maintainer exactly as recommended): this
design documents the write-parallelism mechanism precisely (sections
6.3-6.5) but does NOT authorize a live write-parallel run as part of Phase
9's own segments.** Write-parallelism is, as of this design's approval, an
**authorized-but-not-yet-exercised capability**: the mechanism (concurrency
ceiling, ownership manifest, integration order, mandatory reconciliation
review, correction limit) is fully specified and ready to use, but no live
trial has been run under it, and none is scheduled inside this phase.
Exercising it for the first time is deferred to a later, separately-
initiated moment -- a natural Phase 10 pilot-tuning candidate, or a
Maintainer-initiated trial whenever a genuinely suitable
two-independent-bounded-tasks opportunity arises in real development --
never implicitly triggered by this document's own approval and never
inferred from the read-heavy fan-out (section 4-5) having been exercised
successfully. Reasoning: this repository has zero precedent runs of
write-parallelism under any phase to date (section 2.1); the phase doc's
own six conditions, while each individually satisfiable (section 6.1), have
never been exercised together in this repository, and the first time they
are exercised together should be a small, low-stakes, closely-observed
trial initiated deliberately, not folded silently into this design
document's own approval or into any other fan-out this phase performs. See
D7 (section 10) for the full decision record, including the alternative the
Maintainer did not choose.

### 6.3 Integration order (defined regardless of whether write-parallelism is exercised this phase)

1. Each write-parallel subagent runs in its own `Agent(isolation:
   "worktree")` instance, on its own branch, against its own
   non-overlapping file set (per the ownership manifest).
2. Subagents complete independently; the parent does not merge any
   worktree's branch until ALL subagents in the batch have returned
   (partial integration while siblings are still writing risks a
   mid-flight file-ownership assumption becoming stale).
3. Integration happens in the order the ownership manifest lists
   subagents (1, 2, 3, ...) -- a fixed, pre-declared order, not decided
   ad hoc after the fact, so a human reviewing the eventual merged diff
   can predict which subagent's change would win an unexpected overlap
   before it happens (it should never happen, per the zero-overlap
   requirement, but a fixed order is the correctness backstop if the
   ownership manifest itself turns out to have missed something).
4. Each worktree's branch is merged into the parent's working branch via
   an ordinary `git merge` (or the equivalent the parent session already
   uses), never a force-push or a squash that hides which subagent
   produced which hunk.
5. If step 4 produces a merge conflict despite the ownership manifest's
   zero-overlap claim, this is itself a stopping-rule trigger (section 7)
   -- the ownership manifest was wrong, and the parent stops, does not
   attempt an automatic resolution, and escalates to the Maintainer with
   both subagents' diffs.

### 6.4 Mandatory final reconciliation review

Regardless of how the integration in section 6.3 went, the merged result
goes through `review-tree` (or the Codex equivalent) as an ordinary,
complete, standard-or-high-risk-profile review -- never a lighter-weight
review just because each individual worktree's own diff was previously
"clean." This review specifically checks, in addition to
`review-contract.md` section 4's standing checklist:

- Do the merged pieces actually work together (a compile/build/test run
  against the fully merged tree, not just each worktree's own isolated
  run, since two independently-passing changes can still interact badly
  once combined -- for example, two subagents each adding an
  independently-correct but mutually redundant helper function).
- Does the ownership manifest's zero-overlap claim hold up against the
  actual merged diff (a direct check, not an assumption carried over from
  section 6.1's pre-dispatch manifest).
- Standard regression review (`regression-reviewer`'s full duty,
  `review-contract.md` section 3) against the fully integrated tree.

### 6.5 Cancellation and failure limits specific to write-parallelism

- **Correction limit**: matching `execution-model.md` section 9's existing
  2-corrective-iteration limit for any failing check, a write-parallel
  batch that requires more than 2 corrective rounds to reconcile at
  integration (section 6.3 step 5, or section 6.4's reconciliation review
  finding BLOCKER/HIGH issues) is itself a stopping-rule trigger
  ("integration failures exceed the defined correction limit," the phase
  doc's own wording) -- the batch is abandoned as a parallel attempt and
  the remaining work is redone sequentially, not iterated a third time in
  parallel.
- **Maximum concurrency for write-parallelism: 2, not section 5.1's read-
  heavy ceiling of 4.** Reasoning: write-parallelism's risk (a missed
  overlap, a merge conflict, an integration-time interaction between two
  independently-correct changes) compounds combinatorially with subagent
  count in a way read-only fan-out's risk does not (read-only outputs
  cannot conflict with each other by construction; write outputs can, even
  under a correct-at-design-time ownership manifest, if either subagent's
  actual diff drifts from its declared scope mid-task). A ceiling of 2 for
  this repository's first several write-parallel trials keeps the
  reconciliation review (section 6.4) and the correction-limit check
  (this section) tractable for a human to actually reason about, and
  matches this being the more conservative, less-precedented mode -- the
  ceiling can be revisited once this repository has actual successful
  write-parallel runs on record (a natural Phase 10 pilot-tuning
  question, not pre-decided here).

## 7. Stopping rules (both modes)

Restated, concretely, from the phase doc's own list, each mapped to this
design's specific mechanism:

- **Tasks overlap**: caught by section 5.5's ownership manifest before
  dispatch (read scope for awareness; write scope as a hard stop).
- **Findings conflict**: handled per section 5.6's two-branch policy
  (parent re-derives for low-stakes; escalate to Maintainer for
  high-stakes).
- **Repository state changes invalidate earlier analysis**: the parent
  checks `git status`/`git log` before accepting any subagent's output if
  meaningful time has passed since dispatch (mirroring
  `execution-model.md` section 9's own "if repository state changes under
  an in-progress phase... the orchestrator stops the executor and
  re-validates" rule, applied to a fan-out batch instead of a whole
  phase).
- **The human approval boundary is reached**: any subagent (read-only or
  write-parallel) whose findings surface a gate trigger from
  `execution-model.md` section 7's table stops the whole batch, per that
  section's existing rule -- a fan-out does not get to discover a
  gate-trigger fact in parallel and then proceed past the gate just
  because the discovery happened inside a subagent rather than the main
  session.
- **A high-risk issue is discovered**: same as the above -- an
  in-progress subagent's mid-flight discovery of a security-sensitive
  pattern, a persisted-format break, or an absolute-rule violation
  attempt triggers an immediate batch-wide stop, matching
  `task-classification.md` section 4's existing "any trigger discovered
  mid-flight reclassifies upward immediately" rule, now explicitly
  extended to apply inside a fan-out subagent's own turn, not only the
  main session's.
- **Integration failures exceed the defined correction limit**: section
  6.5's 2-round limit for write-parallelism specifically.

## 8. Proposed large representative task

**Recommendation (part of D8): a real piece of this repository's own
Phase 10 preparation work, not a synthetic benchmark exercise.**

Concretely: **a read-heavy, four-way parallel investigation answering "what
does each of the four already-built provider/integration pipelines
(Claude Code development pipeline, Codex development pipeline, GitHub/CI
integration, evaluations and benchmarks) actually deliver today, and where
does each still have an open gap or unresolved decision," synthesized into
one cross-reference document that becomes real input to Phase 10's own
pilot-tuning work.**

This satisfies the phase doc's acceptance criterion "a large representative
task is completed with parallel analysis" with a task that is:

- **Genuinely large**: four documents (`claude-code-pipeline.md`,
  `codex-pipeline.md`, `github-ci-integration.md`,
  `evaluations-and-benchmarks.md`) totaling several thousand lines, plus
  their own referenced companion contracts, is a real, substantial reading
  task -- not padded to look large.
- **Genuinely disjoint**: each pipeline's own gaps, decisions, and status
  are independent questions (the Claude Code pipeline's own open items do
  not depend on knowing the Codex pipeline's open items first) -- a clean
  4-way split, matching section 5.1's concurrency ceiling exactly, chosen
  because it is the actual natural split, not forced to hit the number.
- **Genuinely valuable, not synthetic**: the synthesized cross-reference is
  real input Phase 10 needs regardless of whether this phase's own
  acceptance criterion existed -- "what is actually built and stable versus
  still-open across Phases 4-8" is exactly the question Phase 10's own
  phase doc (pilot tuning and operating model) will need answered first.
  Running it as this phase's representative task produces a real
  deliverable rather than a throwaway timing exercise.
- **Read-only, so it can run this phase without triggering any of the
  write-parallelism precedent question** (section 6.2) -- this design
  recommends the representative task be a read-heavy fan-out specifically,
  not a write-parallel one, so the acceptance-criteria demonstration does
  not accidentally become this repository's first, unplanned
  write-parallelism trial.
- **Measurable**: the benefit is directly comparable against the
  counterfactual of one session reading all four documents sequentially --
  section 5.10's synthesis requirement to state the measured benefit
  applies directly and concretely here (4 sequential deep-reads of
  several-thousand-line documents each, versus one parallel round-trip).

**Alternative considered**: a synthetic, purpose-built exercise (for
example, a constructed multi-file investigation over deliberately-planted
fixture content, mirroring Phase 8's own eval-scenario methodology).
Rejected as the primary recommendation because Phase 8 already owns that
methodology and vocabulary (evals/scenarios); reusing it here for Phase
9's own acceptance criterion would blur which phase's evidence is which,
and this repository has a genuine, available, valuable real task (the
Phase 10 cross-reference) that does not require inventing a fixture at
all -- the phase doc's own acceptance-criteria wording ("large
representative task") reads more naturally as "run this for real" than
"construct an exercise," especially once a real, available candidate
exists.

## 9. What is explicitly not proposed

- No custom scheduler, runner, wrapper, or service (section 3.3).
- No new agent role, no new skill/command file, no new `.codex/agents/`
  entry -- this design coordinates existing roles (`repository-analyst`/
  `repository-explorer`, `architecture-reviewer` and the 6 specialists,
  `feature-implementer`) run in parallel instances of themselves, never a
  new kind of agent.
- No change to any existing contract's artifact format
  (`investigation-contract.md`, `review-contract.md`,
  `handoff-contract.md`, `completion-contract.md`) -- this design's
  subagent output format (section 5.4) explicitly reuses them.
- No live write-parallel run performed by this design's own segment 1 or
  proposed for segment 2 without a further, explicit Maintainer decision
  (D7).
- No branch-protection, CI, or `.github/` change -- out of this phase's
  scope, unaffected.
- No change to `handoff-contract.md` rule 5's own text is proposed here
  (that would be an edit to a Phase 2 canonical contract, a different kind
  of change than this phase doc authorizes) -- this design is the
  resolution rule 5 already promised, but implemented as this new
  document, referenced from rule 5, not as an edit to rule 5's own
  wording. Whether rule 5's text should be lightly updated to point at
  this document by name is decision D8's second half, below.

## 10. Decision points for the Maintainer (gate)

- **D1 -- Maximum concurrency for read-heavy fan-out (section 5.1).**
  Recommendation: 4, chosen per-task from genuinely disjoint questions,
  never padded. Alternative: a higher fixed ceiling (for example 6, to
  match `review-tree`'s full specialist roster) -- not recommended, since
  6 specialists rarely all trigger on one real diff simultaneously
  (`agent-portfolio.md` section 5.2's routing table shows typical
  engagement of 1-3 specialists per real change) and this repository's
  actual task shapes (section 2.2) do not present genuine 5+-way disjoint
  read-heavy splits today; a ceiling higher than the real need invites
  artificially over-splitting a question just to use the available
  concurrency, which increases synthesis cost for no benefit. A lower
  ceiling (2) was also considered and rejected as too restrictive for the
  section 8 representative task itself, which has a genuine, natural 4-way
  split.
- **D2 -- Whether read-heavy fan-out is authorized for the orchestrator's
  own immediate use, effective as soon as this design is approved, or only
  after the section 8 representative task proves it out first (section
  4).** Recommendation: authorize immediately for read-heavy work only,
  since section 2.1 already establishes this repository has three
  standing, already-approved precedents for read-only parallel fan-out
  (`investigation-contract.md` rule 7, `agent-portfolio.md` section 5.1's
  high-risk row, `review-tree`'s specialist fan-out) -- this design
  formalizes an already-approved pattern for the orchestrator's own use,
  it does not introduce a materially new capability requiring its own
  proof run before any use. The representative task (section 8) still
  happens, as the phase doc's own required acceptance-criteria
  demonstration, but a "prove it once before any other use" gate would be
  stricter than this repository has ever applied to the read-only fan-out
  pattern itself. Alternative: require the section 8 task to run and be
  accepted before this contract is used for anything else -- more
  conservative, defensible given this is nonetheless the first time the
  pattern is written down as a followable contract rather than left as
  each phase's own ad hoc choice, but not recommended given the
  three-precedent history just cited.
- **D3 -- Verification spot-check depth (section 5.7): one claim per
  subagent (as specified) versus a fuller re-check of every claim.**
  Recommendation: one targeted claim per subagent, chosen for maximum
  downstream impact if wrong -- re-verifying every claim would eliminate
  the actual efficiency benefit of delegating the read in the first place
  (the parent would end up doing the same total reading work either way),
  while a single well-chosen spot-check catches the failure mode that
  actually matters (a subagent's whole scoped investigation resting on one
  bad early read) without that cost. Alternative: require 2-3 spot-checks
  per subagent for higher confidence -- reasonable for a first several
  trial runs of this contract specifically, at higher verification cost;
  could be adopted as an explicit, temporary strengthening for the section
  8 representative task even if not the standing rule, at the Maintainer's
  discretion.
- **D4 -- Conflict-handling severity threshold (section 5.6): where
  exactly the low-stakes/high-stakes line falls.** Recommendation: as
  specified (classification, gate-trigger, or completion-criterion impact
  = high-stakes; everything else = low-stakes, parent re-derives
  directly) -- this maps the distinction onto categories this repository's
  contracts already use to decide what needs a human (the approval-gate
  trigger table, `execution-model.md` section 7) rather than inventing a
  new severity scale specific to fan-out conflicts. Alternative: treat
  EVERY subagent disagreement as high-stakes requiring Maintainer
  escalation, for maximum caution -- not recommended, since this would
  make the read-heavy fan-out pattern practically unusable for its own
  stated purpose (a Maintainer would be interrupted for every minor,
  cheaply-resolvable factual disagreement between two investigators, which
  defeats "measurable benefit").
- **D5 -- Whether the ownership manifest (section 5.5) is required for
  every read-only batch, including ones where overlap is obviously safe,
  or only for batches where overlap is plausible.** Recommendation:
  required for every batch, including read-only ones, but trivially
  satisfiable for read-only work (a one-line "read-only, overlap
  permitted" statement) -- the discipline of writing it every time is what
  keeps write-parallel batches (where it is load-bearing) from being the
  first time anyone actually produces one, and the cost for a read-only
  batch is negligible. Alternative: only require it for write-parallel
  batches, skip it entirely for read-only fan-out -- lower overhead for
  the common case, not recommended because it means the manifest habit is
  untested until the highest-stakes moment (the first real write-parallel
  run) rather than already-proven from routine read-only use.
- **D6 -- Maximum concurrency for write-parallelism (section 6.5): 2, or a
  different number.** Recommendation: 2, for this repository's first
  several trials, explicitly revisitable once real write-parallel runs
  exist to learn from (a Phase 10 question, not fixed permanently here).
  Alternative: allow up to 4 (matching the read-heavy ceiling) from the
  start, trusting the ownership-manifest zero-overlap check alone --
  not recommended given zero precedent runs exist yet to validate that the
  manifest check catches every real-world overlap case in practice; 2 is
  the more conservative number to learn from first.
- **D7 -- Whether this design authorizes an actual live write-parallel
  trial run as part of Phase 9 (segment 2 or a segment 3), or defers any
  write-parallel exercise entirely to a later, separately-gated moment
  (section 6.2). APPROVED as recommended: defer.** This design's position
  is that documenting the write-parallel mechanism precisely (section 6) is
  sufficient to satisfy the phase doc's design-level requirements, and
  that the phase doc's acceptance criterion "no conflicting writes occur"
  is more honestly satisfied by NOT attempting a live write-parallel run
  under this phase's own time pressure than by forcing one just to check
  the acceptance-criteria box -- a rushed first trial is a worse way to
  build confidence in a new, higher-risk mode than a deliberately later,
  calmly-scoped one (naturally, a Phase 10 pilot-tuning candidate, or a
  Maintainer-initiated trial whenever a genuinely suitable two-independent-
  bounded-tasks opportunity next arises in real development). As approved,
  write-parallelism is now an **authorized-but-not-yet-exercised**
  capability: sections 6.1-6.5 stand as the binding mechanism for whenever
  a live trial does happen, but no such trial is scheduled inside Phase 9,
  and Phase 9's own acceptance-criteria evidence for "no conflicting writes
  occur" (section 8's representative task) is satisfied entirely through
  read-only fan-out, which by construction cannot produce a write conflict
  -- not through any live write-parallel exercise. The not-chosen
  alternative: authorize a small, explicitly-scoped write-parallel trial
  within this phase's own segment 2/3, using two genuinely small, genuinely
  non-overlapping bounded tasks (for example, two independent documentation
  fixes in two different `.docs/` subdirectories) purely to prove the
  mechanism once under close observation. Recorded here for completeness,
  not adopted.
- **D8 -- Representative task confirmation (section 8), and whether
  `handoff-contract.md` rule 5's text should be lightly updated to
  reference this document by name.** Recommendation: approve the
  four-way pipeline-cross-reference task as specified in section 8 (real,
  available, valuable, naturally 4-way disjoint, read-only); separately,
  yes, update `handoff-contract.md` rule 5 with a one-line addition
  pointing at `controlled-multi-agent-parallelism.md` by name once this
  design is approved (a small, mechanical documentation-currency edit, not
  a policy change, matching `documentation-reviewer`'s own standing duty
  to keep cross-references current) -- since rule 5 explicitly promised
  "until Phase 9 defines the wider coordination contract," leaving it
  unedited after that contract exists would itself be exactly the kind of
  stale cross-reference this repository's own documentation-review
  discipline flags elsewhere (for example, Phase 7's own finding of stale
  agent names in `.github/workflows/*.yml`). Alternative for the first
  half: choose a different large task (for example, a real product-code
  investigation if one becomes available) -- reasonable if the Maintainer
  has a more pressing real need at approval time, but the pipeline
  cross-reference is recommended as the readily-available, zero-fixture-
  setup option that produces genuine Phase 10 value immediately.
  Alternative for the second half: leave `handoff-contract.md` untouched
  and rely on this document's own existence being discoverable via
  `.docs/agentic-sdlc/`'s directory listing -- not recommended, since rule
  5's own wording is a direct, specific promise this document should
  close the loop on explicitly, and the edit is a single line, not a
  restructuring of a Phase 2 canonical contract.
