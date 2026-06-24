# Golden-File Test Agent

Run golden-file tests (regression-strategy.md Layer 2).

**Test file:** tests/golden.test.ts
**Purpose:** Validate deterministic compilation. Runs on every PR via `npm test`.
**Authority:** Can run tests. Cannot modify expected files.
