# No-Emoji Policy for AgentQuilt's Own Instruction Files

**Effective:** June 24, 2026
**Revised:** July 5, 2026 — rescoped to repository governance (see below)
**Status:** Enforced by authoring convention and code review
**Applies to:** Content authored by humans and LLMs working on the AgentQuilt project itself — the fragments under `.agentquilt/agents/` and `.agentquilt/meta-agents/`, and therefore this repository's generated outputs (`AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`)

---

## Scope — What This Policy Is (and Is Not)

This is a **repository governance policy**, not a product feature.

- **In scope:** instruction files for LLMs working on AgentQuilt's development and testing. Anyone (human or AI assistant) authoring or editing fragments in this repository must keep them emoji-free. Because the compiler emits fragments verbatim, clean sources produce clean generated files.
- **Out of scope:** user content. The AgentQuilt CLI **never** transforms fragment bodies during compilation — adapters emit the composed fragments verbatim (v1.1 spec §5/§7). If a user's fragments contain emojis, their compiled agent files contain the same emojis. Rewriting user content is not the framework's job.

> Historical note: until July 2026 the adapters stripped emojis (and Markdown
> headers) from all compiled bodies. This mangled legitimate content
> (`**bold:**`, `https://` URLs, flattened line structure) and imposed a
> project-internal style rule on every user of the CLI. Both transforms were
> removed; bodies are now emitted verbatim.

---

## Policy Statement

Instruction sources in this repository (and thus its generated files) **MUST NOT** contain:

- Emojis (check marks, crosses, rockets, clipboards, gears, warning signs, etc.)
- Smileys or emoticons (colon/semicolon faces and their hyphen/equals variants)
- Any pictographic symbols or non-ASCII decorative characters

**Rationale:**
- Professional documentation consistency
- Accessibility (screen readers can't interpret emojis)
- Cross-platform rendering (emojis render differently on different systems)
- Version control clarity (diffs are easier to read without emojis)
- International compatibility (some systems don't support emoji well)

---

## Enforcement Mechanism

1. **Authoring convention** — LLMs working on this project are instructed via `CLAUDE.md`/`AGENTS.md` (Generated Files Policy section) to use plain-text markers.
2. **Code review** — PRs touching `.agentquilt/**/*.md` are reviewed for policy compliance; the `policy-compliance` meta-agent can be asked to check this.
3. *(Deferred)* A lint rule (`agentquilt lint` / CI gate) that rejects emoji characters in this repository's fragment sources — tracked as Week 2 scope in the project plan.

---

## Plain-Text Alternatives

| Instead of | Write |
|-----------|-----------|
| check mark emoji | `[OK]` or `PASS` or `YES` |
| cross mark emoji | `[NO]` or `FAIL` or `CANNOT` |
| rocket | `READY` |
| clipboard | `LIST` or `TASKS` |
| gear | `CONFIGURE` or `CONFIG` |
| warning sign | `WARNING` or `CAUTION` |
| target | `GOAL` or `TARGET` |
| light bulb | `NOTE` or `IDEA` |
| padlock | `SECURE` or `SECURITY` |
| books | `DOCUMENTATION` or `DOCS` |

**Don't:**
```markdown
<check> CAN: Review code
<cross> CANNOT: Approve PRs
<rocket> Ready for production
```

**Do:**
```markdown
[OK] CAN: Review code
[NO] CANNOT: Approve PRs
Ready for production
```

---

## Frequently Asked Questions

**Q: Can I use emojis in source fragment files?**

A: Not in *this repository* — sources here are the single source of truth for the generated files, which must stay emoji-free. In your own projects, AgentQuilt does not care: your fragments compile verbatim.

**Q: Does the CLI strip emojis from my agents?**

A: No. Adapters emit fragment bodies verbatim. This policy binds contributors to AgentQuilt, not users of AgentQuilt.

**Q: What if I need to show a status indicator?**

A: Use the plain-text alternatives table above.

---

## Related Documentation

- **[CLAUDE.md](../CLAUDE.md)** — Generated Files Policy section
- **[v1.1 addendum](agentquilt-v1.1-addendum.md)** — §5/§7: adapter bodies are the composed fragments verbatim
- **[Test Strategy](stlc/test-strategy.md)** — Testing best practices
