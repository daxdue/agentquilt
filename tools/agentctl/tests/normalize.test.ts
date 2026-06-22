import { describe, it, expect } from "vitest";
import { normalize, fragmentHash } from "../src/core/normalize";
import fs from "fs";
import path from "path";

const fixturesDir = path.join(__dirname, "fixtures");

function readFixture(filename: string): Buffer {
  return fs.readFileSync(path.join(fixturesDir, filename));
}

describe("normalize", () => {
  it("test 1: plain.md produces expected normalized body", () => {
    const raw = readFixture("plain.md");
    const result = normalize(raw);
    // plain.md has LF line endings and single trailing newline already
    expect(result).toBe("Be concise. Prefer direct, technical language.\n\nRun tests before commit.\n");
  });

  it("test 2: crlf.md produces same hash as plain.md (CRLF normalization)", () => {
    const plain = normalize(readFixture("plain.md"));
    const crlf = normalize(readFixture("crlf.md"));
    expect(crlf).toBe(plain);
    expect(fragmentHash(crlf)).toBe(fragmentHash(plain));
  });

  it("test 3: bom-crlf.md produces same hash as plain.md (BOM + CRLF)", () => {
    const plain = normalize(readFixture("plain.md"));
    const bomCrlf = normalize(readFixture("bom-crlf.md"));
    expect(bomCrlf).toBe(plain);
    expect(fragmentHash(bomCrlf)).toBe(fragmentHash(plain));
  });

  it("test 4: front-matter.md body-hash matches equivalent plain file (front-matter stripped)", () => {
    const withFrontMatter = normalize(readFixture("front-matter.md"));
    // Front-matter should be stripped, leaving just the body
    expect(withFrontMatter).toBe("This is the body.\n");
  });

  it("test 5: front-matter-crlf.md produces same hash as front-matter.md", () => {
    const lf = normalize(readFixture("front-matter.md"));
    const crlf = normalize(readFixture("front-matter-crlf.md"));
    expect(crlf).toBe(lf);
    expect(fragmentHash(crlf)).toBe(fragmentHash(lf));
  });

  it("test 6: trailing-blanks.md produces same hash as content without trailing blanks", () => {
    // trailing-blanks.md is "Some content.\n\n\n\n" which should normalize to "Some content.\n"
    const result = normalize(readFixture("trailing-blanks.md"));
    expect(result).toBe("Some content.\n");
  });

  it("test 7: trailing-spaces.md preserves inline trailing whitespace (hard break)", () => {
    // Should preserve the two trailing spaces on the first line
    const result = normalize(readFixture("trailing-spaces.md"));
    expect(result).toBe("First line  \nSecond line\n");
    // Verify it's different from a version with trailing spaces stripped
    const withoutTrailingSpaces = "First line\nSecond line\n";
    expect(fragmentHash(result)).not.toBe(fragmentHash(withoutTrailingSpaces));
  });

  it("test 8: empty-body.md (front-matter only) produces hash of single newline", () => {
    // Front-matter is stripped, leaving empty body which normalizes to "\n"
    const result = normalize(readFixture("empty-body.md"));
    expect(result).toBe("\n");
  });

  it("test 9: fragmentHash produces sha256- prefixed lowercase hex", () => {
    const body = "test content\n";
    const hash = fragmentHash(body);
    expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
  });

  it("test 10: different bodies produce different hashes", () => {
    const hash1 = fragmentHash("content 1\n");
    const hash2 = fragmentHash("content 2\n");
    expect(hash1).not.toBe(hash2);
  });

  it("test 11: identical bodies produce identical hashes", () => {
    const body = "content\n";
    const hash1 = fragmentHash(body);
    const hash2 = fragmentHash(body);
    expect(hash1).toBe(hash2);
  });
});
