# No-Emoji Policy for Generated Files

**Effective:** June 24, 2026  
**Status:** Enforced  
**Applies to:** AGENTS.md, CLAUDE.md, and all generated output files

---

## Policy Statement

Generated files (`AGENTS.md`, `CLAUDE.md`, `.agents/skills/*/SKILL.md`, etc.) **MUST NOT** contain:

- ✅ Emojis (e.g., ✅, ❌, 🚀, 📋, ⚙️, ⚠️)
- 😊 Smileys or emoticons (e.g., :), :D, ;), :-(, =))
- Any pictographic symbols or non-ASCII decorative characters

**Rationale:**
- Professional documentation consistency
- Accessibility (screen readers can't interpret emojis)
- Cross-platform rendering (emojis render differently on different systems)
- Version control clarity (diffs are easier to read without emojis)
- International compatibility (some systems don't support emoji well)

---

## Enforcement Mechanism

The adapter system automatically strips emojis and emoticons during file generation.

### Affected Adapters

1. **Claude Adapter** (`packages/agentquilt/src/core/adapters/claude.ts`)
   - Generates: `.claude/agents/*.md`
   - Applied to: Body fragments only (frontmatter is YAML, no emojis there)

2. **AgentSkills Adapter** (`packages/agentquilt/src/core/adapters/agentskills.ts`)
   - Generates: `.agents/skills/*/SKILL.md`
   - Applied to: Body fragments only

### Emoji Stripping Function

```typescript
function stripEmojis(text: string): string {
  return text
    // Emoji ranges with variation selectors
    .replace(/[\u{1F000}-\u{1F9FF}][\u{FE00}-\u{FE0F}]?/gu, "")
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2300}-\u{27BF}][\u{FE00}-\u{FE0F}]?/gu, "")
    .replace(/[\u{2B50}]/gu, "")
    .replace(/[\u{2705}-\u{274C}]/gu, "")
    .replace(/\u{200D}/gu, "") // Zero-width joiner
    .replace(/\u{200B}/gu, "") // Zero-width space
    .replace(/\u{FE00}-\u{FE0F}/gu, "")
    // Text emoticons
    .replace(/\s*[:;][-=]?[)D(pP\\/|@:*'`~]\s*/g, " ")
    .replace(/\s*[-=][-=]?[)D(P\\/]\s*/g, " ")
    // Cleanup
    .replace(/\s+/g, " ")
    .trim();
}
```

---

## What Gets Stripped

### Emojis Removed

| Input | Output | Category |
|-------|--------|----------|
| ✅ DONE | DONE | Check mark |
| ❌ ERROR | ERROR | X mark |
| 🚀 Ready | Ready | Rocket |
| 📋 Tasks | Tasks | Clipboard |
| ⚙️ Config | Config | Gear (with variation selector) |
| ⚠️ WARNING | WARNING | Warning (with variation selector) |
| 🎯 Goal | Goal | Target |
| 💰 Cost | Cost | Money |

### Emoticons Removed

| Input | Output | Category |
|-------|--------|----------|
| Good work :) | Good work | Smiley |
| Not good :( | Not good | Frown |
| Just joking ;) | Just joking | Wink |
| Haha :D | Haha | Laugh |
| :-) smiley | smiley | Hyphenated variant |
| =) happy | happy | Equal variant |

### Text Preserved

| Input | Output | Category |
|-------|--------|----------|
| Agent123 | Agent123 | Alphanumeric |
| code-review | code-review | Hyphens |
| Hello, world! | Hello, world! | Punctuation |
| [OK] <- proceed | [OK] <- proceed | Brackets/arrows |

---

## Examples

### Before (with emojis)

```markdown
✅ Phase complete: 🚀 Ready to deploy 📋 See checklist 🎯 Goals met
```

### After (stripped)

```markdown
Phase complete: Ready to deploy See checklist Goals met
```

---

## Migration Guide for Agent Authors

If you're writing agent fragments (e.g., `010-role.md`, `020-workflow.md`), avoid emojis entirely:

**❌ Don't do this:**
```markdown
✅ CAN: Review code
❌ CANNOT: Approve PRs
🚀 Ready for production
```

**✅ Do this instead:**
```markdown
[OK] CAN: Review code
[NO] CANNOT: Approve PRs
Ready for production
```

### Translation Table

| Emoji | Plain Text |
|-------|-----------|
| ✅ | [OK] or PASS or YES |
| ❌ | [NO] or FAIL or CANNOT |
| 🚀 | READY |
| 📋 | LIST or TASKS |
| ⚙️ | CONFIGURE or CONFIG |
| ⚠️ | WARNING or CAUTION |
| 🎯 | GOAL or TARGET |
| 💡 | NOTE or IDEA |
| 🔐 | SECURE or SECURITY |
| 📚 | DOCUMENTATION or DOCS |

---

## Testing

A comprehensive test suite validates emoji stripping:

**File:** `packages/agentquilt/tests/emoji-stripping.test.ts`

**Coverage:**
- ✓ 19 tests (all passing)
- ✓ Common emojis (check marks, warning, rocket, etc.)
- ✓ Emoticons (smileys, winks, laughs)
- ✓ Variation selectors (⚙️, ⚠️ with trailing invisible characters)
- ✓ Mixed content (multiple emojis in one line)
- ✓ Whitespace normalization (cleanup after stripping)
- ✓ Text preservation (normal content not affected)

**Run tests:**
```bash
npm test -- emoji-stripping.test.ts --run
```

---

## Implementation Notes

### Why Comprehensive Unicode Ranges?

Emojis span multiple Unicode blocks:

- **1F000-1F9FF**: Main emoji block (most common emojis)
- **2300-27BF**: Miscellaneous symbols and dingbats
- **2B50**: Star (sometimes outside main range)
- **2705-274C**: Check mark to X mark range
- **FE00-FE0F**: Variation selectors (invisible modifiers that change emoji appearance)

The function covers all these to ensure comprehensive stripping.

### Zero-Width Characters

Some characters are invisible but still present:

- **U+200D**: Zero-width joiner (used in emoji sequences like skin tone variations)
- **U+200B**: Zero-width space (sometimes appears with emoji text)

These are stripped to clean up artifacts.

### Whitespace Normalization

After emoji removal, multiple spaces can remain. The function normalizes:
- `"text  :)  more"` → `"text more"` (multiple spaces → single space)
- Leading/trailing spaces are trimmed

---

## Frequently Asked Questions

**Q: Can I use emojis in source fragment files?**

A: Yes, but they'll be stripped during generation. Better practice: avoid them in fragments entirely to keep source clean.

**Q: What if I need to show a status indicator?**

A: Use plain text alternatives:
- `[OK]` or `PASS` instead of ✅
- `[NO]` or `FAIL` instead of ❌
- `READY` instead of 🚀

**Q: Will my generated files look ugly without emojis?**

A: No. Professional Markdown is readable without visual decorations. Use clear structure with headers, lists, and emphasis instead.

**Q: Are there any emojis that won't be stripped?**

A: Comprehensive coverage means almost all emojis will be stripped. If one isn't, it's a bug — open an issue on GitHub.

**Q: Can I override the emoji stripping?**

A: No. This is a hard requirement for generated files. If you need emojis for some reason, use a non-generated file instead.

---

## Related Documentation

- **[CLAUDE.md](../CLAUDE.md)** — Generated Files Policy section
- **[ADR-0005](adr/ADR-0005.md)** — CLI naming and output format standards
- **[Test Strategy](.docs/stlc/test-strategy.md)** — Testing best practices

---

## Changelog

### v1 (June 24, 2026)

- Initial policy: no emojis in AGENTS.md, CLAUDE.md
- Comprehensive emoji stripping in adapter layer
- Emoticon removal (smileys, etc.)
- 19 test cases for validation
- Applies to: Claude, AgentSkills adapters
