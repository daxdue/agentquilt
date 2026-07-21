# ADR-0015: Codex Provider Adapter Uses Standalone Agent Files

## Status

Accepted

## Context

AgentQuilt already compiles canonical agent definitions into provider-native
artifacts through registered adapters. The original v1.1 design proposed that
Codex support emit both `.codex/agents/<name>.toml` and a managed registration
region inside `.codex/config.toml`.

Current Codex custom-agent discovery supports project-scoped standalone TOML
files under `.codex/agents/`. Each file carries its own name, description, and
developer instructions, so mutating a shared user-owned configuration file is
unnecessary. The compiler also needs one consistent ownership rule for all
adapter outputs: the exact bytes an adapter returns must be the bytes hashed,
recorded, written, and checked.

## Decision

Add the `codex` platform as a compile-only provider adapter with these rules:

1. Each canonical agent produces exactly one file at
   `.codex/agents/<name>.toml`. No managed region is written to
   `.codex/config.toml`.
2. The file contains `name`, `description`, and `developer_instructions`.
   Because Codex requires usable routing text and instructions, the adapter
   rejects a description or composed body that is blank after trimming.
   Resolved model and reasoning values are emitted only when configured;
   otherwise Codex inherits its runtime defaults. Neutral permissions map to
   Codex `sandbox_mode` values.
3. The neutral manifest schema accepts provider extension blocks, while each
   adapter owns validation of its provider-specific shapes. `x-codex` supports
   only these non-process fields:
   - `nickname_candidates`: a non-empty array of unique strings. Values are
     trimmed and may contain only ASCII letters, digits, spaces, hyphens, and
     underscores.
   - `skills`: an object containing the required `config` array. Each array
     item requires a nonblank string `path`, permits an optional boolean
     `enabled`, and rejects other keys. An empty `config` array is valid.
   Keys owned by canonical mappings are reserved and a collision is a
   configuration error rather than an implicit override. Process-launching
   fields such as `mcp_servers` and all other unknown keys are rejected;
   provider configuration must not silently expand neutral agent instructions
   into executable local commands.
4. TOML serialization uses `smol-toml`, pinned through the package manifest and
   npm lockfile. Codex adapter version 2 records the stricter validation
   contract and deterministically refreshes affected agent and lock versions.
   The dependency is a small, Node 18-compatible, BSD-3-Clause serializer;
   using it avoids maintaining a bespoke TOML escaping implementation for a
   security-sensitive output format.
5. Adapters own their complete output bytes, including any format-safe static
   provenance comment. The compiler does not prepend a format-agnostic banner
   after hashing. Output hashes therefore cover the exact written bytes.
6. Per-agent output records are ordered by platform and path before they are
   persisted, preserving deterministic lock output.
7. Build treats an existing unclaimed adapter path as user-owned. On first
   claim it refuses to overwrite differing content unless `--force` is used.
   This protection is generic across adapters and uses the previous lock's
   recorded output paths, not provider-specific path rules.
8. When `init` adopts an existing Claude agent while both Claude and Codex are
   selected, a recognized Claude alias (`sonnet`, `opus`, or `haiku`) is
   preserved as an exact Claude-only model override. The new Codex target has
   no model override and inherits the runtime model. Claude-only adoption keeps
   the existing alias-to-tier conversion.
9. The lock reader continues to accept legacy `kind: region` output records
   for compatibility. Current adapters emit file records only; Codex does not
   create or update managed regions.

## Consequences

Positive:

- Codex agents are generated in the format and location Codex discovers
  directly.
- AgentQuilt never edits the repository's shared Codex configuration.
- Hashes, drift checks, and written files describe the same byte sequence.
- Hand-authored provider files are protected when a target first claims them.
- Projects can opt into Codex without pinning a model name that will age in the
  scaffold.
- Mixed Claude and Codex adoption produces a buildable project while retaining
  the adopted Claude model exactly.
- Invalid Codex-specific extension shapes fail before malformed TOML is
  written.

Negative:

- Adding TOML serialization introduces a small runtime dependency and a new
  supply-chain review surface.
- A pre-existing provider file whose bytes differ from fresh output requires an
  explicit `--force` decision before AgentQuilt can own that path.
- Extension authors cannot replace canonical Codex fields through `x-codex`;
  they must use the neutral manifest fields instead.
- Executable Codex configuration such as MCP process definitions is outside the
  adapter's extension allowlist and must remain explicitly user-managed.

## Superseded decisions

This ADR supersedes the Codex managed-region portions of ADR-0008 and the
original v1.1 addendum design. Addendum section 6.2 now summarizes the
implemented standalone-file contract; section 6.3 retains the rejected
managed-region proposal only as historical decision context.

## Exclusions

- No Codex API invocation or model runtime is added.
- No `.codex/config.toml` registration or managed-region support is added.
- No reverse adoption of existing Codex TOML files is added.
- The existing `outputPaths` configuration field remains deferred; Codex uses
  the fixed discovery path.
- No default Codex model identifiers are scaffolded.
- Existing hand-authored development agents under this repository's `.codex/`
  directory are not migrated by this change.
- Generated-output pruning is not added.
