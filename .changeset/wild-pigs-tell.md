---
---

Adopt Changesets and automate the release/publish workflow (ADR-0013). No
package behavior change — `publishConfig` is added for npm provenance but
doesn't affect what ships. Empty changeset: this PR sets up the release
mechanism itself, so it doesn't carry a version bump of its own.
