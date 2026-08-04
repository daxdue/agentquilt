---
"agentquilt": minor
---

Add `agentquilt lint`, validating agent-definitions sources: manifest schema
errors are reported per agent instead of aborting the whole run, same-directory
fragments sharing an `NNN` ordering prefix are flagged as a collision (the
concrete form of the long-planned "duplicate ID detection" rule — fragment
identity is the file path, not a declared id), malformed front-matter YAML
and a non-string-array `tags` field are reported as warnings, and an agent
not wired into any `agent-definitions` target is an error. Output format and
exit codes (0 clean, 1 any ERROR, 2 config error, 3 I/O error) match the
long-standing spec in `PROJECT_PLAN.md`/`ADR-0009`. Scope is agent-definitions
sources only for this release; document-target/`_shared` fragment linting is
not yet covered.
