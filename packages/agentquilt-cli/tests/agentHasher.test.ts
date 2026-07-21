import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { tmpdir } from "os";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";
import { hashAgent, computeMetaHash, computeBodyHash } from "../src/core/agentHasher";
import { loadAgentDir } from "../src/core/agentLoader";

describe("agentHasher", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = path.join(tmpdir(), `agentquilt-hash-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should compute consistent meta hash", () => {
    const def1 = { description: "Test", model: "balanced" };
    const def2 = { model: "balanced", description: "Test" };

    const hash1 = computeMetaHash(def1 as any);
    const hash2 = computeMetaHash(def2 as any);

    // Should be equal because keys are sorted
    expect(hash1).toBe(hash2);
  });

  it("should compute different meta hash for different definitions", () => {
    const def1 = { description: "Test 1", model: "balanced" };
    const def2 = { description: "Test 2", model: "balanced" };

    const hash1 = computeMetaHash(def1 as any);
    const hash2 = computeMetaHash(def2 as any);

    expect(hash1).not.toBe(hash2);
  });

  it("should compute the same meta hash regardless of key order inside array-of-object values", () => {
    // Regression test: x-codex.skills.config is an array of {path, enabled}
    // objects. Two manifests that only differ in the key order within one
    // array element are semantically identical and must hash identically —
    // otherwise a purely cosmetic reformat falsely bumps the agent version.
    const def1 = {
      description: "Test",
      "x-codex": {
        skills: {
          config: [
            { enabled: true, path: "/skills/foo" },
            { path: "/skills/bar" },
          ],
        },
      },
    };
    const def2 = {
      description: "Test",
      "x-codex": {
        skills: {
          config: [
            { path: "/skills/foo", enabled: true },
            { path: "/skills/bar" },
          ],
        },
      },
    };

    const hash1 = computeMetaHash(def1 as any);
    const hash2 = computeMetaHash(def2 as any);

    expect(hash1).toBe(hash2);
  });

  it("still distinguishes definitions that differ in array element order or content", () => {
    const def1 = {
      description: "Test",
      "x-codex": { skills: { config: [{ path: "/skills/foo" }, { path: "/skills/bar" }] } },
    };
    const def2 = {
      description: "Test",
      "x-codex": { skills: { config: [{ path: "/skills/bar" }, { path: "/skills/foo" }] } },
    };

    expect(computeMetaHash(def1 as any)).not.toBe(computeMetaHash(def2 as any));
  });

  it("should hash agent with body fragments", () => {
    const agentDir = path.join(tempDir, "hash-test-agent");
    mkdirSync(agentDir, { recursive: true });

    writeFileSync(
      path.join(agentDir, "agent.yaml"),
      'description: "Test"\nmodel: balanced\n',
      "utf8"
    );
    writeFileSync(path.join(agentDir, "010-role.md"), "You are helpful.\n", "utf8");
    writeFileSync(path.join(agentDir, "020-tone.md"), "Be friendly.\n", "utf8");

    const record = loadAgentDir(agentDir, tempDir);
    const result = hashAgent(record);

    expect(result.bodyHash).toBeTruthy();
    expect(result.metaHash).toBeTruthy();
    expect(result.agentVersion).toBeTruthy();
    expect(result.fragmentMap.size).toBe(2);
  });

  it("should produce consistent hash for same agent content", () => {
    // Load same agent twice to verify consistency
    const agentDir = path.join(tempDir, "hash-consistent");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(
      path.join(agentDir, "agent.yaml"),
      'description: "Test"\nmodel: balanced\n',
      "utf8"
    );
    writeFileSync(path.join(agentDir, "010-role.md"), "Same content.\n", "utf8");

    const record1 = loadAgentDir(agentDir, tempDir);
    const hash1 = hashAgent(record1);

    // Load again (same files)
    const record2 = loadAgentDir(agentDir, tempDir);
    const hash2 = hashAgent(record2);

    // Hash should be consistent for same content and path
    expect(hash1.agentVersion).toBe(hash2.agentVersion);
    expect(hash1.bodyHash).toBe(hash2.bodyHash);
    expect(hash1.metaHash).toBe(hash2.metaHash);
  });

  it("should detect changes in body fragments", () => {
    const agentDir1 = path.join(tempDir, "hash-body-change-1");
    const agentDir2 = path.join(tempDir, "hash-body-change-2");

    mkdirSync(agentDir1, { recursive: true });
    writeFileSync(
      path.join(agentDir1, "agent.yaml"),
      'description: "Test"\n',
      "utf8"
    );
    writeFileSync(path.join(agentDir1, "010-role.md"), "Version 1.\n", "utf8");

    mkdirSync(agentDir2, { recursive: true });
    writeFileSync(
      path.join(agentDir2, "agent.yaml"),
      'description: "Test"\n',
      "utf8"
    );
    writeFileSync(path.join(agentDir2, "010-role.md"), "Version 2.\n", "utf8");

    const record1 = loadAgentDir(agentDir1, tempDir);
    const record2 = loadAgentDir(agentDir2, tempDir);

    const hash1 = hashAgent(record1);
    const hash2 = hashAgent(record2);

    expect(hash1.agentVersion).not.toBe(hash2.agentVersion);
  });

  it("should handle empty fragment list", () => {
    const agentDir = path.join(tempDir, "hash-empty");
    mkdirSync(agentDir, { recursive: true });

    writeFileSync(
      path.join(agentDir, "agent.yaml"),
      'description: "Empty agent"\n',
      "utf8"
    );

    const record = loadAgentDir(agentDir, tempDir);
    const result = hashAgent(record);

    expect(result.fragmentMap.size).toBe(0);
    expect(result.bodyHash).toBeTruthy();
    expect(result.agentVersion).toBeTruthy();
  });
});
