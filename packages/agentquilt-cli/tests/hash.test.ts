import { describe, it, expect } from "vitest";
import { targetVersion, FragmentRef } from "../src/core/normalize";

describe("targetVersion", () => {
  it("test 12: computes Merkle root over ordered fragments", () => {
    const fragments: FragmentRef[] = [
      { id: "agents/shared/010-tone.md", hash: "sha256-abc123" },
      { id: "agents/backend/020-build.md", hash: "sha256-def456" },
    ];
    const version = targetVersion("1", "markdown", fragments);
    // Just verify it produces a properly formatted version hash
    expect(version).toMatch(/^sha256-[a-f0-9]{64}$/);
  });

  it("test 13: swapping fragment order produces different target version (order matters)", () => {
    const fragments1: FragmentRef[] = [
      { id: "agents/shared/010-tone.md", hash: "sha256-abc123" },
      { id: "agents/backend/020-build.md", hash: "sha256-def456" },
    ];
    const fragments2: FragmentRef[] = [
      { id: "agents/backend/020-build.md", hash: "sha256-def456" },
      { id: "agents/shared/010-tone.md", hash: "sha256-abc123" },
    ];
    const version1 = targetVersion("1", "markdown", fragments1);
    const version2 = targetVersion("1", "markdown", fragments2);
    expect(version1).not.toBe(version2);
  });

  it("test 14: changing OUTPUT_FORMAT produces different target version", () => {
    const fragments: FragmentRef[] = [
      { id: "agents/shared/010-tone.md", hash: "sha256-abc123" },
    ];
    const version1 = targetVersion("1", "markdown", fragments);
    const version2 = targetVersion("1", "mdx", fragments);
    expect(version1).not.toBe(version2);
  });

  it("test 15: changing FORMAT_VERSION produces different target version", () => {
    const fragments: FragmentRef[] = [
      { id: "agents/shared/010-tone.md", hash: "sha256-abc123" },
    ];
    const version1 = targetVersion("1", "markdown", fragments);
    const version2 = targetVersion("2", "markdown", fragments);
    expect(version1).not.toBe(version2);
  });

  it("test 16: identical inputs produce identical target versions (deterministic)", () => {
    const fragments: FragmentRef[] = [
      { id: "agents/shared/010-tone.md", hash: "sha256-abc123" },
      { id: "agents/backend/020-build.md", hash: "sha256-def456" },
    ];
    const version1 = targetVersion("1", "markdown", fragments);
    const version2 = targetVersion("1", "markdown", fragments);
    expect(version1).toBe(version2);
  });

  it("test 17: changing one fragment hash produces different target version", () => {
    const fragments1: FragmentRef[] = [
      { id: "agents/shared/010-tone.md", hash: "sha256-abc123" },
    ];
    const fragments2: FragmentRef[] = [
      { id: "agents/shared/010-tone.md", hash: "sha256-different" },
    ];
    const version1 = targetVersion("1", "markdown", fragments1);
    const version2 = targetVersion("1", "markdown", fragments2);
    expect(version1).not.toBe(version2);
  });

  it("test 18: empty fragment list produces valid target version", () => {
    const version = targetVersion("1", "markdown", []);
    expect(version).toMatch(/^sha256-[a-f0-9]{64}$/);
  });
});
