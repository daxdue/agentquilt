# AgentQuilt Test Strategy

## Purpose

AgentQuilt requires two testing layers:

1. Traditional software testing for CLI/framework correctness.
2. Agent behavior testing for generated prompt correctness.

---

## Test Levels

### Unit Tests

**What:** Validate individual functions in isolation.

**Coverage:** Normalization, hashing, schema validation, fragment scanning, config loading, lock diffing, adapters, model resolution.

**Framework:** Vitest with 75% line coverage threshold (excluding CLI handlers and schema files which are integration/unit-tested indirectly).

**Examples:**
- `fragmentScanner.test.ts` — byte-lex ordering, deduplication, tag extraction, POSIX paths
- `configLoader.test.ts` — preset resolution, validation rules, config load errors
- `lockWriter.test.ts` — lock creation, round-trip, drift detection

**AI Assistance:** code-review-agent flags code changes that lack unit test coverage.

### Integration Tests

**What:** Validate command-level behavior end-to-end.

**Coverage:** `agentquilt build`, `agentquilt check` (happy path and drift), `agentquilt init`, `agentquilt agents add`, `agentquilt agents list`.

**Framework:** Vitest with temp directories and actual CLI invocation.

**Examples:**
- `integration.test.ts` — build→check pipeline, drift detection, preset auto-fill

**Current gaps:**
- `agentquilt init` scaffolding output
- `agentquilt agents add` manifest creation
- `agentquilt agents list` output format

**AI Assistance:** qa-agent tracks missing integration tests; eval-agent tests CLI behavior changes.

### Golden-File Tests

**What:** Validate deterministic compiled output against known-good expectations.

**Input:**
- Config (targets, includes)
- Instruction fragments (Markdown with optional front-matter)

**Expected Output:**
- Generated Markdown files (AGENTS.md, CLAUDE.md, etc.)
- Lock file (agentquilt.lock with fragment hashes and target versions)

**Scenarios (3 total):**
1. Single target with shared + specific fragments
2. Multi-target with shared fragments scoped differently
3. Front-matter tags captured in lock, stripped from output

**Framework:** `tests/golden.test.ts` — compiles, diffs against `tests/fixtures/golden/*/expected/`.

**AI Assistance:** eval-agent verifies golden outputs match compiled prompts; flags content regressions.

### Eval Tests (Future)

**What:** Validate expected agent behavior through static and behavioral evals.

**Types:**
- **Static evals** — grep-style prompt checks (required concepts present, forbidden content absent)
- **Mock-response evals** — run baseline interactions against compiled prompts
- **Live model evals** — optional future layer; send prompt + test input to LLM, grade response

**Framework:** `agentquilt eval` command (to be implemented Week 3).

**Current scope:** None implemented; first evals planned for Week 3 with static checks only.

**AI Assistance:** eval-agent generates eval cases from PR descriptions; security-agent generates adversarial test inputs.

### Security Tests

**What:** Validate security boundaries and threat mitigations.

**Scope:**
- Path traversal (include paths bounded by sourceDir)
- YAML injection (schema validation)
- Lock file integrity (tampering detected)
- Secret leakage (no API keys in fixtures)
- Dependency CVEs (npm audit)

**Framework:** Unit tests + static scan + code review.

**Examples:**
- Path traversal test in `configLoader.test.ts` (planned Week 2)
- Security agent in `pr-quality-gate.yaml` reviews high-risk PRs

**AI Assistance:** security-agent scans diffs for secrets and high-risk patterns; generates adversarial test inputs.

---

## Regression Strategy

Defined in `.docs/stlc/regression-strategy.md`. Three-layer detection:

1. **Deterministic output** — `agentquilt check` detects drift
2. **Golden-file tests** — catch normalization/ordering/assembly changes
3. **Eval suite** — catch behavioral regressions (future)

Every behavior-changing code change must either:
- Pass existing tests and evals
- Add new tests/evals
- Update baseline with explicit justification + human approval

---

## Test Infrastructure

### Coverage Thresholds

- **Lines:** 75% (CLI handlers excluded)
- **Branches:** 65%
- **Functions:** 75%
- **Statements:** 75%

### TypeScript Checking

- `tsconfig.json` — main codebase (src/)
- `tsconfig.test.json` — includes tests/, ensures type checking on test files

### CI Test Gates

**G5 — PR Quality Gate** runs:
1. `tsc --project tsconfig.test.json` (typecheck)
2. `npm test -- --run` (all tests)
3. `npm run coverage` (coverage thresholds)
4. `agentquilt check` (drift detection)
5. `agentquilt build` (manual check)

---

## Test Evidence in CI

CI produces:

- ✅ Test results (pass/fail, timing, coverage %)
- ✅ Typecheck results (no type errors)
- ✅ Drift check results (generated files match lock)
- ⏳ Eval results (planned Week 3)
- ⏳ Security scan results (npm audit to be added)

---

## AI Agent Roles in Testing

| Agent | Responsibility |
|---|---|
| **code-review-agent** | Flags untested code paths; suggests test cases for risky changes |
| **eval-agent** | Runs behavioral evals; detects semantic regressions; updates baselines |
| **security-agent** | Scans diffs for secrets/risks; generates adversarial test inputs |
| **qa-agent** | Tracks missing test coverage; suggests scenarios |

**Important:** Agents flag gaps and suggest tests. Humans write and approve the actual test code and baseline updates.