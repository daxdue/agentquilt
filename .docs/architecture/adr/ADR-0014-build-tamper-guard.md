# ADR-0014: Build Refuses to Overwrite Hand-Edited Generated Files

## Status

Accepted

## Context

The generated-files policy (see CONTRIBUTING.md / generated files policy fragment) states that `agentquilt.lock`, `AGENTS.md`, `CLAUDE.md`, and `.claude/agents/*.md` must never be manually edited. `agentquilt check` correctly detects the violation: if a generated file's on-disk content doesn't match what the compiler would produce from current fragments, `check` reports "content differs" and exits 1.

But `agentquilt build` unconditionally overwrote every output with `writeFileSync`, with no comparison against what was already on disk. A hand-edited generated file was silently discarded and replaced with the compiled output on the very next build — with no warning, no diff, and the same `[OK] wrote <path>` line as any ordinary rebuild. `agentquilt check` afterward reported everything as matching, because the file now literally was the compiled output. The violation left no trace once someone ran `build`, and any real work in that manual edit was lost with no recovery path.

## Decision

`agentquilt build` now distinguishes two cases before overwriting an existing output file whose disk content differs from the freshly compiled content:

1. **Legitimate rebuild** — the previous lock's recorded version for this target/agent differs from the version computed now (a fragment, manifest, or definition changed since the last build). Build overwrites as before; this is the normal, expected workflow.
2. **Hand-edited generated file** — the previous lock's recorded version is unchanged, yet the disk content no longer matches what that version compiles to. Since the compiler is deterministic, this combination is only possible if someone edited the generated file directly. Build refuses to overwrite that specific output, prints an error naming the path, and exits with a non-zero status. The lock and all other unaffected outputs are still written normally.

A new `--force` flag bypasses this guard entirely (skips reading the previous lock for comparison purposes) and restores the previous unconditional-overwrite behavior, for the case where discarding the manual edit is intentional.

This uses data already present in `agentquilt.lock` — `targets[].version` for document targets, `agents[].version` for agent-definitions outputs — so no lock schema change was needed.

If no previous lock exists, or the target/agent has no prior entry (first build, new target), there is nothing to protect against tampering with, so build proceeds unconditionally.

## Rationale

**Refuse over warn-and-overwrite**: a warning that appears for one line among dozens of `[OK] wrote ...` lines is easy to miss in CI logs or a busy terminal. Requiring `--force` makes the human decide, matching the "no silent conflict resolution" principle already applied to fragment merges (see ADR-0007) and the explicit generated-files policy in CLAUDE.md.

**Reuse existing lock fields over adding new ones**: `target.version` and `agent.version` are already a pure function of fragment content, order, and format/adapter version (ADR-0007). If that version is unchanged since the last recorded build, the compiler is guaranteed to reproduce byte-identical output for byte-identical source — so any disk/compiled mismatch under an unchanged version can only originate from an edit made outside of `build`. This lets the guard piggyback on data the lock already carries instead of introducing a new per-file content-hash field.

## Consequences

Positive:

- A hand-edited generated file is never silently discarded; the human must explicitly confirm via `--force`.
- Legitimate rebuilds (fragment/manifest changes) are unaffected — no new friction for the common case.
- No lock schema or format-version change required.

Negative:

- `build` must read `agentquilt.lock` before writing (previously write-only). If the lock file is corrupted or hand-edited, this can degrade to "nothing to protect against" (falls back to unconditional overwrite for entries it can't find), not a new failure mode.
- A single blocked output halts that file's write but not the rest of the build; a subsequent `check` will correctly keep flagging that one file as drifted until resolved by `--force` or by reverting the manual edit.
