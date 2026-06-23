# Regression Testing Strategy

## Overview

A regression is an unintended change in compiled agent behavior or tool output. AgentQuilt uses three layers to detect regressions:

1. **Deterministic output layer** — `agentquilt check` detects drift in generated files (AGENTS.md, CLAUDE.md, etc.)
2. **Unit + integration layer** — golden-file tests, unit tests, and integration tests ensure core compiler and CLI logic is unchanged
3. **Behavioral layer** — eval suite checks that compiled agent instructions have expected behavior

---

## What Counts as a Regression?

### Deterministic Output Regression

Any of:
- Fragment hash changes without source fragment body change
- Target version changes without fragment addition/removal/reordering or format change
- Generated Markdown content differs from what the compiler produces
- Lock file has new/removed/modified entries without config change

**Detection:** `agentquilt check` exits 1 when disk lock/outputs differ from in-memory compile. This is a hard error in CI.

### Behavioral Regression

Any of:
- Compiled agent prompt has different instructions (even if word-for-word similar)
- Agent behavior changes without explicit source change
- Eval case that passed in baseline now fails
- Model cannot follow instructions in compiled prompt that it followed in baseline

**Detection:** Eval suite runs static checks (prompt-presence) and mock-response evals against compiled outputs. AI eval agent compares prompts semantically.

---

## Automated Regression Detection

### Layer 1: Deterministic Build Output (`agentquilt check`)

**Mechanism:** Recompile all targets in memory, diff against disk lock and generated files.

**Entry point:** CI gate `pr-quality-gate.yaml` → required check `agentquilt check`

**Result:** Exits 0 if no drift, exits 1 if any output changed.

**When it detects regressions:**
- Fragment content changed (hash mismatch)
- Fragment order changed (target version mismatch)
- Format version changed (all targets affected)
- Manifest metadata changed (agent version mismatch)

### Layer 2: Golden-File Tests

**Mechanism:** `tests/golden.test.ts` compiles three scenarios (single-target, multi-target, front-matter) and compares against expected lock and outputs.

**Entry point:** CI gate `pr-quality-gate.yaml` → required check `npm test -- --run`

**Result:** Test fails if compiled output differs from golden expected.

**When it detects regressions:**
- Normalization logic changes (produces different hash)
- Fragment sorting changes (alters target version)
- Markdown assembly changes (produces different output)
- Front-matter handling changes (tags extraction, stripping)

### Layer 3: Eval Suite (Future)

**Mechanism:** Run static evals (grep-style prompt checks) and mock-response evals (sample interactions) against compiled agents.

**Entry point:** CI gate `pr-quality-gate.yaml` → eval-agent task

**Result:** Eval fails if required content missing or forbidden content present.

**When it detects regressions:**
- Critical instructions removed from compiled prompt
- Safety boundaries weakened
- Tool usage constraints violated
- Output format expectations broken

---

## AI-Assisted Semantic Regression Detection

The eval-agent runs additional checks beyond golden-file tests:

### Semantic Comparison

Compare compiled prompt from this PR against baseline version. Flag:
- Same instruction worded differently (semantic shift test)
- Instruction removed without justification
- New instruction added without being mentioned in PR description
- Ordering changed in a way that affects priority or precedence

### Mock-Response Evaluation

Run stored baseline interactions through the newly compiled agent prompt. Flag:
- Response format differs from baseline
- Agent refuses interaction that baseline accepted
- Agent accepts risky interaction that baseline refused
- Tone/personality changes significantly

### Baseline Update Workflow

If a regression is discovered:

1. **Triage** — determine if it's intentional or unintended
   - Intentional: update eval baseline + document rationale in PR
   - Unintended: fix the code and recompile
2. **Review** — human verifies the baseline update is correct
3. **Merge** — only after human approval of the regression and updated baseline

---

## Regression Workflow

Regression detected → Triage → Root Cause → Fix or Accept

### 1. Detection

- CI reports failure: `agentquilt check` exits 1, eval fails, or golden-file test fails
- Logs show which files differ (AGENTS.md version mismatch, lock fragment hash change, etc.)

### 2. Triage

**Is this intentional?**

- **Yes**: This change is a required behavior change. Accept with rationale. Update golden files / evals / migration notes. Proceed with approval.
- **No**: This is an unintended side effect. Investigate root cause. Fix code. Recompile. Verify `agentquilt check` exits 0.

### 3. Root Cause

Common causes:

| Cause | Signal | Fix |
|---|---|---|
| Fragment body changed unintentionally | Hash mismatch in lock | Revert fragment content |
| Fragment ordering changed | Target version mismatch | Check fragment naming (NNN- prefix) |
| Normalization logic changed | Hash mismatch with same content | Review normalize.ts diff |
| Adapter serialization changed | Agent output differs | Review adapter implementation |
| Config change | New/removed target or fragment | Revert config change |

### 4. Fix or Accept

**If unintended:** Fix the code. Recompile. Verify all checks pass.

**If intended:** Document the change:
- Update golden-file expected outputs
- Update evals if behavior changed
- Write migration notes if this affects users
- Add rationale to commit message

---

## AI Agent Roles in Regression Prevention

| Agent | Role |
|---|---|
| code-review-agent | Flags code changes that look like they could cause regressions (side effects, global state changes, unsafe mutations) |
| eval-agent | Runs behavioral evals after compile; compares semantic meaning of compiled prompts; updates baseline when intentional changes detected |
| security-agent | Flags regressions in security checks (e.g., path traversal validation removed) |
| risk-agent | Tracks regressions as risks until resolved; escalates if not addressed |

**Important:** Agents detect and flag regressions. Humans decide whether they're acceptable and approve baseline updates.
