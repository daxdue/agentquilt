---
"agentquilt": minor
---

Add a Codex provider adapter that compiles canonical agents to standalone
`.codex/agents/<name>.toml` files, with init support, deterministic TOML,
model inheritance, permission mapping, drift checking, and first-claim
protection for existing provider files.

Also fixes a manifest-hash determinism bug where key order inside
array-valued extension fields (e.g. `x-codex.skills.config`) could change
an agent's lock version with no real content change; adds realpath-based
symlink/path-traversal containment checks for agent-definitions sources
(see ADR-0016), document sources, and every generated output path (see
ADR-0017); and makes the Claude adapter reject `x-claude` keys that
collide with canonical frontmatter fields, matching the Codex adapter's
existing validation.

Migration notes:

- Run `agentquilt build` once after upgrading. The corrected canonical
  manifest hashing and adapter version update intentionally refresh affected
  agent versions, output hashes, and the lock file.
- Existing differing files at newly claimed provider paths remain user-owned;
  build exits with code 1 until the file is reconciled or the maintainer
  explicitly reruns with `--force`. AgentQuilt never edits
  `.codex/config.toml`.
- Lock files containing legacy `kind: region` output records remain readable.
  New adapter output records are emitted as `kind: file` only.
