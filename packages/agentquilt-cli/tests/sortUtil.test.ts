import { describe, it, expect } from "vitest";
import { byteCompare } from "../src/core/sortUtil";

describe("byteCompare", () => {
  it("orders strings by Unicode code point, not locale collation", () => {
    // Under localeCompare, lowercase and uppercase often interleave
    // (e.g. "a" < "B" < "b" < "C"); byte order keeps all uppercase ASCII
    // before all lowercase ASCII since 'A'-'Z' (0x41-0x5A) precede
    // 'a'-'z' (0x61-0x7A).
    const input = ["b", "A", "B", "a"];
    expect([...input].sort(byteCompare)).toEqual(["A", "B", "a", "b"]);
  });

  it("returns 0 for equal strings", () => {
    expect(byteCompare("same", "same")).toBe(0);
  });

  it("returns negative when a sorts before b, positive otherwise", () => {
    expect(byteCompare("a", "b")).toBeLessThan(0);
    expect(byteCompare("b", "a")).toBeGreaterThan(0);
  });

  it("sorts numeric-prefixed filenames byte-lexicographically", () => {
    const input = ["020-tone.md", "010-role.md", "005-intro.md"];
    expect([...input].sort(byteCompare)).toEqual([
      "005-intro.md",
      "010-role.md",
      "020-tone.md",
    ]);
  });

  it("orders non-ASCII characters by code point, unaffected by locale", () => {
    const input = ["é", "e", "z"]; // é (U+00E9), e, z
    // Byte order: 'e' (0x65) < 'z' (0x7A) < é (UTF-8: 0xC3 0xA9)
    expect([...input].sort(byteCompare)).toEqual(["e", "z", "é"]);
  });
});
