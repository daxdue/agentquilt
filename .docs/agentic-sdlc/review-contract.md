# Agentic SDLC — Review Contract

Date: 2026-07-12
Status: Active (Phase 2 deliverable of the agentic SDLC effort)

## 1. Purpose and when it applies

This contract defines every review in the [lifecycle](lifecycle.md): the
diff review of the small profile, the independent review of the standard
profile, and the regression, documentation, and specialist reviews of the
standard/high-risk profiles. One findings format and one severity ladder
apply to all of them. Adjacent stages: consumes the diff, return handoffs,
and plan; feeds the [correction loop](#6-correction-loop) and ultimately the
findings-and-resolutions section of the
[PR summary](completion-contract.md#3-artifact-format-pr-summary).

## 2. Independence and authority

- The reviewer is never the implementer of the work under review (a
  different agent/session, or the human). Review roles are read-only; the
  regression reviewer may additionally execute deterministic checks.
- Reviewers find and recommend; they do not fix, approve, or merge
  (ADR-0004). Resolution belongs to the correction loop; acceptance of
  residual findings belongs to the Maintainer.

## 3. Review types and their required checks

All reviews check correctness and scope (diff matches the recorded
classification and plan; no scope expansion). In addition:

| Review | Profile | Must explicitly check |
| ------ | ------- | --------------------- |
| Diff review | small | The full checklist in section 4 against the final diff |
| Independent code review | standard, high-risk | Design conformance, error handling, test adequacy for changed code, section 4 checklist |
| Regression review | standard, high-risk | Behavior deltas; generated-output drift (`npx agentquilt check` evidence); golden/fixture diffs each traced to a cause; public CLI behavior and exit-code compatibility |
| Documentation review | standard, high-risk | Doc impact and staleness; `AGENTS.md`/`CLAUDE.md` currency via their fragments (`.agentquilt/agents/project/`), never via the generated files |
| Specialist reviews | high-risk (as triggered) | Security (validation, path resolution, YAML, secrets), schema/persisted-format compatibility, deterministic-output guarantees, eval impact |

## 4. AgentQuilt-specific review checklist

Every review verifies, where the diff touches the area:

1. No generated file (`AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`,
   `agentquilt.lock`) was hand-edited; their diffs trace to a named source
   change plus rebuild.
2. Fragment/manifest/config edits are accompanied by the rebuild in the same
   change, and drift-check evidence exists.
3. Golden-file, fixture, or baseline changes are explained by root cause —
   "updated expected output" without a why is a BLOCKER
   ([risk-and-approval-policy section 6](risk-and-approval-policy.md#6-baseline-and-snapshot-changes)).
4. Deterministic-compilation guarantees hold: LF normalization before
   hashing, code-point ordering (no `localeCompare`), stable output for
   unchanged sources.
5. Schema changes keep `schemas/*.schema.json` and the Zod schemas
   consistent, and carry the persisted-format approval.
6. Public CLI behavior: commands, flags, output shape, and exit codes
   (0 success / 1 drift / 2 config or validation / 3 I/O) unchanged, or the
   change carries the public-interface approval and compatibility statement.
7. Tests were not weakened to pass (deleted assertions, broadened matchers,
   skipped cases) without justification.
8. Plain-text policy respected in authored instruction sources (no emojis).

## 5. Findings: severities and format

### 5.1 Severity ladder

| Severity | Meaning | Resolution requirement |
| -------- | ------- | ---------------------- |
| BLOCKER | Defect, policy violation, or unexplained generated/fixture diff that must not merge | Fix and re-verify before merge; not acceptable by waiver |
| HIGH | Likely defect or contract violation with material impact | Fix, or explicit Maintainer acceptance recorded in the PR |
| MEDIUM | Real issue with limited blast radius | Fix now, or tracked follow-up (issue ref) recorded in the PR |
| LOW | Minor issue, polish, small inconsistency | Optional; note in PR if skipped |
| SUGGESTION | Non-binding improvement idea | No action required |

### 5.2 Finding format

Every finding — any review type, any severity — carries evidence, impact,
and a proposed verification method:

```markdown
## Review Findings

- Scope reviewed: <diff/commit range, artifacts consulted>
- Reviewer: <role/agent/human>  Independent of implementer: yes
- Checks executed (regression review): <command + exit code, or "none">

### F1 — <severity>: <title>

- Location: <path:line or artifact section>
- Evidence: <exact observation: quoted code/output/diff hunk — what was seen>
- Impact: <what goes wrong, for whom, under what conditions>
- Proposed verification: <the command, test, or manual step that proves the
  issue is fixed (or refutes the finding)>
- Suggested direction (optional, non-binding): <hint>

### Summary

| Severity | Count |
| -------- | ----- |

- Verdict: no blocking findings | blocking findings present
```

A finding without all three of evidence, impact, and proposed verification
is incomplete and does not enter the correction loop.

## 6. Correction loop

1. The implementer addresses findings in severity order, recording per
   finding: resolution (fixed / disputed / accepted-by-Maintainer /
   follow-up ref), the fixing commit, and the result of the finding's
   proposed verification method.
2. The original reviewer re-checks resolved BLOCKER and HIGH findings using
   the proposed verification method.
3. Disputes (implementer disagrees a finding is valid) go to the Maintainer
   with both positions; agents do not overrule each other.
4. After two correction rounds with unresolved BLOCKER/HIGH findings, stop
   and escalate to the Maintainer with the full evidence.

## 7. Entry and exit criteria

- Entry: implementation and focused verification complete; diff stable.
- Exit: findings issued in the section 5 format; correction loop closed with
  every BLOCKER fixed and re-verified, every HIGH fixed or human-accepted,
  and MEDIUM dispositions recorded. The findings-and-resolutions table
  travels into the PR summary.
