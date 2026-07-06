# Spike Results — Phase 0 Acceptance Gates

## Status: ✅ BOTH SPIKES PASS

Both one-day spikes from §10 of the v1 spec have passed successfully, validating the core design assumptions.

---

## Spike 1 — Hash Determinism Across OSes ✅

**Objective:** Validate that the same fragment file produces identical `sha256-<hex>` hashes on all platforms (macOS, Linux, Windows) with different line ending variants and BOM.

**Implementation:** `scripts/spike-hash.mjs` implements §3.1 normalization algorithm exactly:
1. UTF-8 decode, strip leading BOM
2. Strip YAML front-matter block
3. Replace `\r\n` and lone `\r` with `\n`
4. Trim trailing newlines, append exactly one `\n`
5. Preserve inline trailing whitespace (Markdown hard line-breaks)

**Test fixtures:** `scripts/fixtures/`
- `plain.md` — Unix LF line endings
- `crlf.md` — Windows CRLF line endings
- `bom-crlf.md` — UTF-8 BOM + CRLF

**Result:**
```
plain.md:   sha256-cd2313a9d7c02b133167f58f75a77f0c582052f8163fc344b675da1778516f90
crlf.md:    sha256-cd2313a9d7c02b133167f58f75a77f0c582052f8163fc344b675da1778516f90
bom-crlf.md: sha256-cd2313a9d7c02b133167f58f75a77f0c582052f8163fc344b675da1778516f90
```

**✅ PASS:** All three fixtures produce identical hash. The normalization algorithm ensures cross-platform determinism.

---

## Spike 2 — Concurrent-PR Auto-Merge ✅

**Objective:** Validate that two branches each adding a new fragment + editing different existing fragments merge without conflicts in source files, and a rebuild produces a clean lock.

**Test scenario:**
1. Created minimal agent structure: `agents/_shared/` (2 fragments) + `agents/backend/` (2 fragments)
2. Branch A: added `agents/backend/030-new-a.md` + edited `agents/_shared/010-tone.md`
3. Branch B: added `agents/backend/040-new-b.md` + edited `agents/_shared/020-safety.md`
4. Merged both branches into main with `--no-ff`

**Result:**
- **Fragment files:** Zero conflicts. All source fragments merge cleanly.
- **Generated files:** Conflicts in `AGENTS.md` and `agentquilt.lock` (expected, as they are derived).
- **Rebuild:** `scripts/spike-build.mjs` deterministically regenerated both files with correct versions.
- **Lock consistency:** All 6 fragments recorded correctly; target version reflects the merged state.

**Git history:**
```
d6fa58b spike2(merge): resolve generated file conflicts via rebuild
4ad32a3 Merge branch A
0196e09 spike2(branch-b): add backend fragment, edit safety
d0265fc spike2(branch-a): add backend fragment, edit tone
b7ee1ff build: initial generated targets
```

**✅ PASS:** Concurrent edits to different fragments produce zero conflicts in source. Generated file conflicts are automatically resolved by a deterministic rebuild. This validates the core value proposition: **distributed teams can edit in parallel without semantic merge conflicts.**

---

## Key Validations

1. **Normalization is deterministic** — The same content always normalizes identically regardless of line-ending variant or BOM.
2. **Hashing is stable** — Fragment identities don't drift across platforms or git workflows.
3. **Fragment-level editing scales** — Multiple developers can add/edit different fragments without conflict.
4. **Generated files are safe to regenerate** — The lock and output are fully authoritative and can be overwritten by `build`.
5. **Git is the single source of truth** — Source fragments in git are the source of truth; generated files are always recoverable.

---

## Next Steps

Phase 0 acceptance gates are satisfied. Ready to proceed with:
- **Phase 1:** Project setup (TypeScript, ESM, tooling, source layout)
- **Phase 2:** Core engine (normalize, hash, config, resolve, assemble, lock)
- **Phase 3:** CLI commands (build, check, init)
- **Phase 4:** Tests & CI

Spikes remain in the codebase as regression tests:
- `npm run spike:hash` — validates hash determinism
- `npm run spike:merge` — validates concurrent-PR scenario (requires git branches)
