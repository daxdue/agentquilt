# Classification and Planning Workflow (CLS, PLN)

## Classification (CLS)

Inputs: the task or issue text; issue fields if present.

1. Work through the high-risk triggers first
   (`.docs/agentic-sdlc/task-classification.md` section 2.1): schemas or
   persisted formats, public interfaces (CLI commands, flags, exit codes
   0/1/2/3, config format, published package surface), compiler semantics
   (normalization, hashing, ordering, adapters), generated-output
   semantics, security, release behavior, persistence. Any hit makes the
   class high-risk regardless of size.
2. Then check the small criteria (section 2.2): one concern, bounded diff,
   single session, no gate trigger, covered by tests, no golden or fixture
   change. All must hold for small.
3. Everything else is standard.
4. Record the result in the Task Classification artifact
   (`task-classification.md` section 3), including the answered trigger
   checklist. Mark post-investigation confirmation as pending.

Output: Task Classification artifact. Handoff: to the repository analyst
(INV).

## Planning (PLN)

Inputs: the Repository Investigation artifact; the confirmed
classification.

1. Verify the investigation covers every area the plan will touch; send it
   back if it does not (do not plan on missing evidence).
2. Break the work into ordered bounded tasks, each meeting the bounded-task
   definition in `.docs/agentic-sdlc/implementation-plan-contract.md`
   section 2: one concern, an explicit allowed-file set, checkable done
   criteria, completable in one session.
3. For each task: state the test requirements and whether a rebuild is
   needed (`npx agentquilt build` plus `npx agentquilt check` whenever
   fragments, manifests, or config are edited).
4. Flag every approval-gate trigger the plan touches
   (`.docs/agentic-sdlc/risk-and-approval-policy.md` section 3); a flagged
   plan routes to the Maintainer (APP) before dispatch.
5. High-risk profile: include the architecture-plan section and note
   whether an ADR is required per the governance ADR policy.
6. State what is out of scope, and the expected effect on generated
   outputs and fixtures (or "none").

Output: Implementation Plan artifact
(`implementation-plan-contract.md` section 4).

## Completion criteria

Plan exit criteria (`implementation-plan-contract.md` section 5): ordered
bounded tasks defined; every gate trigger flagged; test and rebuild steps
included per task.

## Handoff

- If any gate trigger is flagged, or the profile is high-risk: to the
  Maintainer (APP) with the plan and investigation.
- Otherwise: per-task Implementation Handoffs
  (`.docs/agentic-sdlc/handoff-contract.md` section 3) dispatched to the
  feature implementer, sequentially by task order.
