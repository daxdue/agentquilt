# Independent Review Workflow (REV)

## Inputs

- The full diff of the change.
- The Return Handoffs, the Implementation Plan, and the Repository
  Investigation.
- The recorded Task Classification.

## Steps

1. Scope check first: verify the diff matches the recorded classification
   and the approved plan. A diff that exceeds its class or plan is a HIGH
   finding (`.docs/agentic-sdlc/task-classification.md` section 4).
2. Walk the AgentQuilt-specific checklist in
   `.docs/agentic-sdlc/review-contract.md` section 4 for every touched
   area: generated files trace to source changes plus rebuild;
   golden/fixture changes have root causes; deterministic-compilation
   guarantees hold; JSON Schema / Zod parity; public CLI behavior and exit
   codes; tests not weakened; plain-text policy.
3. Design conformance: does the change fit the architecture described in
   `.docs/architecture/overview.md` and the ADRs? Were alternatives
   considered where the plan promised them?
4. ADR necessity: does the change trigger an ADR per CONTRIBUTING.md
   (architecture, source format, generated artifact policy, CI gates,
   security model, eval strategy, release process)? If required and
   missing, that is a BLOCKER; offer a draft skeleton for human
   refinement.
5. Code-level review of the diff using the review checklist fragment that
   follows this one: correctness, error handling, type safety, security
   patterns, test adequacy, simplification.
6. Write findings. Every finding carries evidence (quoted code, output, or
   diff hunk), impact, and a proposed verification method; a finding
   missing any of the three is incomplete and does not enter the
   correction loop.

## Output

The Review Findings artifact exactly per
`.docs/agentic-sdlc/review-contract.md` section 5.2, with the severity
ladder of section 5.1 (BLOCKER / HIGH / MEDIUM / LOW / SUGGESTION) and the
summary table with a verdict.

## Completion criteria

Findings issued in the required format; during the correction loop,
resolved BLOCKER and HIGH findings re-checked with each finding's proposed
verification method; disputes escalated to the Maintainer, never
overruled between agents.

## Handoff

Findings to the correction loop (feature implementer). The
findings-and-resolutions table travels into the PR summary.
