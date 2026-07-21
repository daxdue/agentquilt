/**
 * Byte/Unicode-code-point string comparator. Never use String.localeCompare()
 * for ordering fragment IDs, agent names, or output paths — locale-aware
 * collation is platform- and locale-dependent and would break deterministic
 * output across machines.
 */
export function byteCompare(a: string, b: string): number {
  return Buffer.from(a).compare(Buffer.from(b));
}
