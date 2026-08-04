---
"agentquilt": minor
---

Add `agentquilt agents check-models`, an advisory command that warns when a
committed `modelTiers` entry looks stale against a platform's local CLI
cache (currently Codex, via `~/.codex/models_cache.json`). It never runs in
CI and never affects `build` or `check` — `.agentquilt/config.yaml` remains
the single deterministic source of truth for compiled output; this command
only helps a maintainer notice drift before it surfaces as a confusing
failure for a contributor. See ADR-0018 for the design rationale, including
why live model resolution was rejected as a way to solve this (it would
break build/check determinism).
