# Golden-File Test Workflow

On PR with fragment/config changes:

1. Run: npm test -- --run tests/golden.test.ts
2. For each golden scenario (single-target, multi-target, front-matter):
   a. Compile fixtures/golden/<scenario>/config.yaml
   b. Compare lock file vs. expected/agentquilt.lock
   c. Compare outputs (AGENTS.md, CLAUDE.md, etc.) vs. expected/
3. Report pass/fail

Fail = regression in normalization, sorting, or assembly logic.

Update golden fixtures only if intentional change (human approval + rationale).
