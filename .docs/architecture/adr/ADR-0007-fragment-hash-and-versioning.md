# ADR-0007: Fragment Hash and Target Versioning Strategy

## Status

Accepted

## Context

AgentQuilt must detect drift between source fragments and generated outputs reliably across platforms (Windows, macOS, Linux). Hashes must be stable regardless of line endings, byte-order marks, or whitespace differences that don't affect the semantic content of agent instructions.

Two hash levels are needed:

1. **Fragment hash** — identifies the content of a single fragment
2. **Target version** — identifies the combined content of all fragments in a target, in order

## Decision

### Normalization before hashing (v1 §3.1)

Before computing any hash, each fragment body is normalized:

1. Strip UTF-8 BOM if present
2. Normalize line endings to LF (`\n`)
3. Strip YAML front-matter block (`---\n...\n---\n`)
4. Collapse multiple trailing newlines to exactly one
5. Ensure file ends with exactly one `\n`

### Fragment hash

`sha256-<64 hex chars>` over the normalized body (UTF-8 bytes). Front-matter is excluded — changing tags or metadata does not change the fragment hash or bump any target version.

### Target version (Merkle-style root)

```
targetVersion = sha256(FORMAT_VERSION + "\n" + OUTPUT_FORMAT + "\n" + join(sorted fragment entries))
```

Where each fragment entry is `id:hash\n`. Sorted by fragment `id` using byte-lex order (no `localeCompare`). This means:

- Adding/removing a fragment changes the version
- Reordering fragments changes the version
- Changing format version changes all target versions
- Changing only front-matter does NOT change the version

### No `localeCompare`

All sorting uses `Buffer.compare()`. Locale-aware sorting is banned because it produces different orderings on different OS/locale configurations, breaking determinism.

## Rationale

**LF normalization** ensures that checking out the same file on Windows (CRLF) and macOS (LF) produces the same hash. Without this, hashes would differ across developer environments and CI.

**Front-matter exclusion from hash** separates metadata concerns (tags, risk, status) from content identity. Editors can add tags without triggering target version bumps, which would force regeneration of all downstream outputs.

**Merkle-style target version** binds content, order, and format version together. This prevents silent truncation or reordering bugs that would produce different agent behavior without changing any individual file.

## Consequences

Positive:

- Cross-platform hash stability (CRLF/LF/BOM safe)
- Tagging and metadata changes don't cause unnecessary regeneration
- Target version detects ordering changes, not just content changes
- Deterministic across all major OS platforms

Negative:

- Normalization must run before every hash computation — no shortcut
- Front-matter exclusion means changing tags silently does not invalidate cached outputs
