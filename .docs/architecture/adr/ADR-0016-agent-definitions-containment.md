# ADR-0016: Realpath-Based Containment Checks for Agent-Definitions Sources

## Status

Accepted

## Context

`agent-definitions` targets in `.agentquilt/config.yaml` name agent
directories by a `sourceDir` and a list of `agents` selectors (or `"*"` for
discovery). Both are author-controlled config values, and both ultimately
resolve to filesystem paths that get read (`agent.yaml`, `*.md` fragments)
and, transitively, compiled into build outputs.

RISK-004 (`policies/risks/risk-register.yaml`) already covers the sibling
case for document targets: an `include:` entry like `../../../../etc/passwd`
was not rejected by `validateConfig()`. The fix there (`configLoader.ts`
Rule 5) resolves each include against `sourceDir` and asserts the resolved
path starts with the resolved `sourceDir` — a lexical (string-prefix)
containment check.

RISK-008 identified the same gap for `agent-definitions` targets
specifically: `target.sourceDir` was not bounds-checked against the project
root, so a config with `sourceDir: ../../../etc` could direct the compiler
outside the project.

A lexical check alone has a gap a symlink can exploit: an agent directory
(or an individual `agent.yaml` / fragment file) that is lexically inside
`sourceDir` can still be a symlink whose *target* resolves outside it. A
lexical prefix check on the symlink's own path does not see through the
link. Since `agent-definitions` sources can be scanned automatically
(`agents: "*"`) and their content is compiled directly into build outputs,
an unnoticed symlink pointing outside the source tree would let a
project's compiled agent output be built from bytes the config author never
intended to include.

## Decision

Add `realpathSync`-based containment checks as defense-in-depth, layered on
top of the existing lexical checks, at two points:

0. **Global source validation** (`configLoader.ts`) — require the configured
   global `sourceDir` to remain lexically and physically inside the repository
   before any document include or agent target is scanned. This extends the
   same boundary to document sources and prevents a symlinked source root from
   importing content outside the checkout.

1. **Config validation** (`configLoader.ts`, `validateConfig()`'s Rule A) —
   resolve every target-specific `sourceDir` against the repository root and
   require both lexical and real-path containment in that root. Then, for
   every explicitly selected `agentName`, retain the existing lexical check
   and require the resolved agent directory to remain physically inside the
   target source root. This directly closes RISK-008 even for an empty or
   wildcard target and catches a symlinked source root or agent directory
   before the target is compiled. A missing target source root is a
   configuration error rather than an empty wildcard result.

2. **Agent load time** (`agentLoader.ts`) — `resolveAgents()` performs the
   same real-path containment check on each resolved agent directory before
   calling `loadAgentDir()`; `loadAgentDir()` itself (via
   `assertFileContained()`) additionally real-path-checks `agent.yaml` and
   every discovered fragment file individually. This goes beyond what
   RISK-008 asked for — it catches a symlink planted *inside* an otherwise
   legitimate agent directory (e.g. a fragment file that is itself a
   symlink to a file elsewhere on disk), which a directory-level check alone
   would miss.

Both layers throw `ConfigError` on an escape, with a message that
distinguishes plain lexical traversal ("path traversal ... is not allowed")
from a symlink-mediated escape ("symlink traversal ... is not allowed" /
"escapes its directory through a symlink"), so the failure mode is legible
in CI output.

The comparison itself (`isPathContained` / `assertPathContained`) is a
single shared primitive in `pathSecurity.ts`, used by both layers, so the
containment semantics can't drift between config-validation time and
load time.

## Rationale

**Defense-in-depth over one checkpoint**: config validation runs once per
`agentquilt build`/`check` invocation and is the cheapest place to fail
fast, but it only inspects paths named directly in config (`agents: [...]`
or `sourceDir`). Agent-load time additionally protects `agents: "*"`
discovery and individual fragment files, which config validation never
enumerates. Neither layer alone covers everything the other does.

**Lexical check first, realpath second**: the lexical check is free (no
syscalls) and rejects the common case (literal `..` traversal) before
touching the filesystem. The `realpathSync()` check only runs after the
lexical check passes and (in `validateConfig`) after confirming
`agent.yaml` exists, so a nonexistent path never pays the cost of an
`fs.realpathSync` call that would only throw `ENOENT`.

**Shared primitive over three independent implementations**: the
comparison logic (`childPath === parentPath || childPath.startsWith(parentPath + path.sep)`)
was being reimplemented inline at every call site with byte-for-byte
identical logic. Extracting `isPathContained()`/`assertPathContained()`
into `pathSecurity.ts` removes the risk of one copy's containment
semantics silently diverging from another's during a future edit.

## Consequences

Positive:

- The global source root cannot escape the repository for either document or
  agent-definition targets.
- Closes RISK-008: every `agent-definitions target.sourceDir` is directly
  bounded to the repository root, matching the RISK-004 precedent for
  document targets.
- Symlink-mediated escapes — both at the agent-directory level and at the
  individual-file level — are rejected with a specific error, not silently
  followed.
- One shared containment primitive (`pathSecurity.ts`) instead of several
  independently maintained inline copies.

Negative:

- Two more `realpathSync()` calls per agent (config validation, then again
  at load time) — real but small filesystem-syscall overhead per build,
  bounded by the number of agents in a target.
- A project that legitimately uses a symlinked agent directory or fragment
  file (e.g. a shared agent vendored via symlink from outside
  `.agentquilt/agents/`) will now be rejected; there is no escape hatch.
  This is intentional: `agents: "*"` and individual fragment discovery are
  meant to compile only content physically inside the source tree, and the
  addressed risk is specifically about *unintended* escapes.
- A wildcard target whose source root does not exist now fails validation;
  projects must create the configured source directory before building.

## References

- RISK-004, RISK-008 — `policies/risks/risk-register.yaml`
- `tests/security.test.ts` — "path traversal validation (RISK-004)" and
  "agent-definition selector containment" describe blocks
- `tests/pathSecurity.test.ts` — direct unit coverage of the shared
  containment primitive
