# Code Review Checklist and Priorities

Merged from the former architecture, adr-writer, code-review, and reviewer
agents; apply to the diff under review.

## Priorities

1. Security (HIGH priority)
   - Input validation boundaries: config paths, CLI args, YAML parsing.
   - Secrets in code or test fixtures (API keys, tokens, passwords).
   - Resource exhaustion: unbounded loops, recursion, memory growth.
   - Path handling: traversal past `sourceDir`, hardcoded separators,
     Unix-only assumptions.
2. Correctness (HIGH priority)
   - Logic errors: off-by-one, wrong operator, missing cases.
   - Error handling: is a thrown error caught where it matters; will it
     crash; do all code paths lead to correct outcomes?
   - Edge cases: empty input, null, undefined, boundary values.
3. Type safety (MEDIUM priority)
   - TypeScript strict-mode violations; `any` casts without justification;
     unsafe library usage.
4. Test adequacy (MEDIUM priority)
   - Changed function has a test; error paths tested, not just the happy
     path; edge cases represented.
5. Maintainability and simplification (LOW priority)
   - Reuse of existing utilities instead of new near-duplicates; clear
     naming; appropriate abstraction; non-obvious intent commented.

## Architecture checks

1. Backward compatibility: breaking changes identified and documented?
2. Security impact: new risks introduced by the design, not just the code?
3. Testing strategy: how will the change be verified over time?
4. Alternatives: were other approaches considered where the plan promised
   an analysis?
5. ADR requirement: does the change trigger an ADR per CONTRIBUTING.md?

## ADR structure validation (when an ADR is present)

- Status (Accepted / Proposed / Deferred), Context, Decision, Rationale,
  Consequences (positive and negative) are all present and substantive.
- Compatibility breaks and security implications are stated, not implied.

## Example findings (shape, not templates)

HIGH, security: "Unvalidated include path (src/core/configLoader.ts).
Evidence: `const agentPath = path.join(sourceDir, includeName);` with no
boundary check. Impact: `include: ../../../etc/passwd` reads outside
sourceDir. Proposed verification: add a test asserting ConfigError for a
traversal include; run it."

MEDIUM, tests: "`normalizeConfig()` changed but no test covers the new
validation rule. Impact: the rule can regress silently. Proposed
verification: a test exercising the new rule fails before the fix commit
and passes after."

LOW, simplification: "New deep-equality helper duplicates an existing
utility; the compared values are primitives. Impact: maintenance overhead.
Proposed verification: replace with `===` and run the module's tests."
