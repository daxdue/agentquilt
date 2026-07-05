/**
 * Strip emojis, smileys, and pictographic symbols per the emoji policy
 * (.docs/EMOJI_POLICY.md): generated files must not contain emojis or
 * emoticons. Shared by all adapters.
 *
 * Line structure is preserved: bodies are emitted verbatim per v1.1 §5/§7
 * (Markdown headers, blank lines, and indentation are part of the system
 * prompt), so only emoji/emoticon characters are removed — never newlines.
 */
export function stripEmojis(text: string): string {
  const stripped = text
    // Extended emoji ranges; consume one trailing space so "✅ DONE" → "DONE"
    .replace(/[\u{1F000}-\u{1F9FF}][\u{FE00}-\u{FE0F}]?[ \t]?/gu, "") // Main emoji + optional variation selector
    .replace(/[\u{1F300}-\u{1F9FF}][ \t]?/gu, "") // Additional emoji coverage
    .replace(/[\u{2300}-\u{27BF}][\u{FE00}-\u{FE0F}]?[ \t]?/gu, "") // Misc symbols + variation selector
    .replace(/\u{2B50}[ \t]?/gu, "") // Stars
    .replace(/[\u{2705}-\u{274C}][ \t]?/gu, "") // Check marks, X marks, etc
    .replace(/[\u{200D}\u{200B}]/gu, "") // Zero-width joiner / zero-width space
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "") // Variation selectors alone
    // Text emoticons — only when standing alone between whitespace/line
    // boundaries; unanchored matching mangles prose (`**bold:**` → `:*`,
    // `https://` → `:/`, `std::vector` → `::`)
    .replace(/(?<=^|[ \t])[:;][-=]?[)D(pP\\/|@:*'`~](?=[ \t]|$)/gm, "") // :) :( ;) :D etc with optional dash/equal
    .replace(/(?<=^|[ \t])[-=][-=]?[)D(P\\/](?=[ \t]|$)/gm, ""); // -) =) etc

  // Trim trailing whitespace left behind by removals (also blanks lines that
  // consisted only of emojis); inline whitespace is left untouched
  return stripped
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n");
}
