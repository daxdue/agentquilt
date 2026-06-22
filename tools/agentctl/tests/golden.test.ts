import { describe, it, expect } from "vitest";
import { compile } from "../src/core/compiler";
import { createLock, writeLock, readLock } from "../src/core/lockWriter";
import { loadConfig, validateConfig } from "../src/core/configLoader";
import { readFileSync } from "fs";
import path from "path";

const fixtureDir = path.join(__dirname, "fixtures/golden");

describe("golden-file integration", () => {
  it("compiles fixture and produces exact lock and output", async () => {
    const configPath = path.join(fixtureDir, "config.yaml");
    const config = loadConfig(configPath);
    const sourceDir = path.join(fixtureDir, "agents");

    // Validate config
    validateConfig(config, sourceDir);

    // Compile
    const result = await compile(config, sourceDir);

    // Create lock
    const lock = createLock(result.fragmentMap, result.targets);

    // Compare lock
    const expectedLockPath = path.join(fixtureDir, "expected/agentquilt.lock");
    const expectedLock = JSON.parse(readFileSync(expectedLockPath, "utf8"));
    expect(lock).toEqual(expectedLock);

    // Compare output
    for (const target of result.targets) {
      const expectedPath = path.join(fixtureDir, `expected/${target.output}`);
      const expectedContent = readFileSync(expectedPath, "utf8");
      expect(target.content).toBe(expectedContent);
    }
  });
});
