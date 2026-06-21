export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function normalizeTrailingWhitespace(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

export function ensureTrailingNewline(text: string): string {
  if (!text.endsWith("\n")) {
    return text + "\n";
  }
  return text;
}

export function canonicalizeText(text: string): string {
  const normalized = normalizeLineEndings(text);
  const trimmed = normalizeTrailingWhitespace(normalized);
  return ensureTrailingNewline(trimmed);
}
