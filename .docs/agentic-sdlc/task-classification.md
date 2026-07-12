# Agentic SDLC — Task Classification Contract

Date: 2026-07-12
Status: Active (Phase 2 deliverable of the agentic SDLC effort)

## 1. Purpose and when it applies

Classification is the first step of every change and selects the workflow
profile ([lifecycle section 4](lifecycle.md#4-workflow-profiles)). It is
performed before investigation, re-confirmed after investigation, and
recorded in the PR. Adjacent stages: consumes the task/issue; feeds
[investigation](investigation-contract.md) and, for standard/high-risk,
[planning](implementation-plan-contract.md).

## 2. Classes and criteria

Work through the high-risk triggers first, then the small criteria. If any
high-risk trigger applies, the class is high-risk regardless of size. If not
all small criteria hold, the class is standard.

### 2.1 High-risk triggers

A change is **high-risk** if it touches any of:

| Trigger | Repository examples |
| ------- | ------------------- |
| Schemas or persisted formats | `schemas/*.schema.json`, Zod schemas, manifest/block format, `agentquilt.lock` format, golden fixture format under `packages/agentquilt-cli/tests/fixtures/` |
| Public interfaces | CLI commands, flags, output, exit codes (0/1/2/3), config file format, published package surface (`packages/agentquilt-cli` `dependencies`, `files`, `bin`) |
| Compiler semantics | normalization, hashing (SHA-256, LF normalization), fragment ordering (code-point sort, no `localeCompare`), target versioning, adapter serialization — notably `src/core/compiler.ts`, `src/core/configLoader.ts`, `src/core/fragmentScanner.ts` (mirrors `policies/gates/pr-quality-gate.yaml` riskCriteria) |
| Generated-output semantics | changes to how outputs are produced or verified (`build`, `check`, adapters). Note: editing fragment content and rebuilding is NOT this trigger — that is ordinary work covered by the drift gate |
| Security | input validation, path resolution, YAML parsing, secret handling |
| Release behavior | versioning, packaging, publish steps, `release.yml` |
| Persistence | anything a user's repository keeps on disk in a format we must keep readable |

These triggers coincide with the human approval gates in the
[risk-and-approval-policy](risk-and-approval-policy.md); a high-risk class
always implies at least one mandatory approval.

### 2.2 Small criteria

A change is **small** only if ALL of the following hold:

- One concern, bounded diff, completable in a single session.
- No high-risk trigger and no approval-gate trigger (no new dependency, no
  destructive operation, no persisted-format or public-interface change).
- The affected area has existing test coverage, or the fix includes the
  covering test.
- Generated files change only as the mechanical result of a source edit plus
  `npx agentquilt build` (or not at all).
- No golden-file or fixture expectations change.

Typical: a bug fix in one function plus its test; a doc typo; a fragment
wording fix plus rebuild.

### 2.3 Standard

Everything else: ordinary features, refactoring, multi-file changes, new
tests, doc restructuring — anything neither small nor high-risk.

## 3. Artifact format: Task Classification

Recorded in the issue or PR description. Small profile may compress this to
the single `Class:` line plus a one-clause rationale.

```markdown
## Task Classification

- Task: <issue link or one-line description>
- Class: small | standard | high-risk
- Triggers checked: <list each high-risk/gate trigger with yes/no>
- Rationale: <why this class; evidence if non-obvious>
- Affected areas: <paths or components, best current knowledge>
- Expected artifacts: <per the profile in lifecycle.md section 4>
- Classified by: <role/agent/human> on <date>
- Post-investigation confirmation: pending | confirmed | reclassified to <class> because <reason>
```

## 4. Reclassification rules

- Upward reclassification (small -> standard -> high-risk) happens
  immediately and unilaterally the moment a trigger appears — mid-plan,
  mid-implementation, or mid-review. Stop, record the new class, and enter
  the stages the new profile requires (a small change discovering a schema
  impact goes back through PLN and APP).
- Downward reclassification requires an explicit human decision recorded in
  the classification artifact. Agents never downgrade a class.
- Reviewers verify the recorded class against the final diff; a diff that
  exceeds its class is a HIGH finding
  ([review-contract](review-contract.md)).
