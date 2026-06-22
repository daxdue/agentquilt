# Spike Scripts

Two validation scripts that verify core AgentQuilt assumptions before full implementation.

## Spike 1: Hash Determinism Across OSes

**File**: `spike-hash.mjs`

Validates that fragment normalization and SHA-256 hashing produce identical results across different platforms and file encodings.

**Test fixtures** (`fixtures/`):
- `plain.md` — LF line endings, no BOM
- `crlf.md` — CRLF line endings, same content
- `bom-crlf.md` — UTF-8 BOM + CRLF line endings

**Expected result**: All three fixtures produce identical `sha256-...` hashes.

### Running the spike (standalone)

```bash
cd scripts
node spike-hash.mjs
```

Expected output:
```
✓ PASS: All three fixtures produce identical hash
  Hash: sha256-...
```

### Running as part of test suite

Spike 1 is formalized in the Vitest suite:

```bash
cd tools/agentquilt
npm test -- tests/normalize.test.ts tests/hash.test.ts
```

---

## Spike 2: Concurrent-PR Auto-Merge

**File**: `spike-2-verify.sh`

Validates that Git can cleanly merge two concurrent PRs that each add a new fragment and edit different existing fragments — confirming the per-file fragment model eliminates merge conflicts.

**Scenario**:
1. Main branch: `agents/_shared/010-tone.md`, `agents/backend/010-role.md`
2. Branch A: adds `agents/backend/020-build.md`, edits `_shared/010-tone.md`
3. Branch B: adds `agents/backend/030-testing.md`, edits `backend/010-role.md`
4. Merge A into main, then B into main
5. Verify: zero Git conflicts in `agents/` directory

**Running the spike**:

```bash
./scripts/spike-2-verify.sh
```

Expected output:
```
✓ PASS: No Git conflicts in merged fragments
✓ Spike 2 prerequisites satisfied
```

---

## Phase 0 Status

Both spikes are implemented as:
- **Spike 1**: Vitest tests in `tools/agentquilt/tests/{normalize,hash}.test.ts`
- **Spike 2**: Bash script that creates a temp git repo and validates merge-free parallel edits

Run all Phase 0 validation:

```bash
# Spike 1 (comprehensive normalize/hash tests)
cd tools/agentquilt
npm test -- --run

# Spike 2 (concurrent merge scenario)
cd scripts
./spike-2-verify.sh
```

Both must pass before Phase 1 (core compiler) begins.
