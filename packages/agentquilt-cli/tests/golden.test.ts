import { describe, it, expect } from "vitest";
import { compile } from "../src/core/compiler";
import { createLock } from "../src/core/lockWriter";
import { loadConfig, validateConfig } from "../src/core/configLoader";
import { readFileSync, existsSync } from "fs";
import path from "path";

const goldenDir = path.join(__dirname, "fixtures/golden");

async function runGolden(scenario: string) {
  const fixtureDir = path.join(goldenDir, scenario);
  const configPath = path.join(fixtureDir, "config.yaml");
  const config = loadConfig(configPath);
  const sourceDir = path.join(fixtureDir, "agents");

  validateConfig(config, sourceDir);
  const result = await compile(config, sourceDir);
  const lock = createLock(result.fragmentMap, result.targets);

  return { result, lock, fixtureDir };
}

describe("golden-file integration", () => {
  it("single target: compiles fixture and produces exact lock and output", async () => {
    const { result, lock, fixtureDir } = await runGolden(".");

    const expectedLock = JSON.parse(
      readFileSync(path.join(fixtureDir, "expected/agentquilt.lock"), "utf8")
    );
    expect(lock).toEqual(expectedLock);

    for (const target of result.targets) {
      const expectedContent = readFileSync(
        path.join(fixtureDir, `expected/${target.output}`),
        "utf8"
      );
      expect(target.content).toBe(expectedContent);
    }
  });

  it("multi-target: two document targets share fragments, each gets correct content", async () => {
    const { result, lock, fixtureDir } = await runGolden("multi-target");

    expect(result.targets).toHaveLength(2);

    const expectedLock = JSON.parse(
      readFileSync(path.join(fixtureDir, "expected/agentquilt.lock"), "utf8")
    );
    expect(lock).toEqual(expectedLock);

    for (const target of result.targets) {
      const expectedContent = readFileSync(
        path.join(fixtureDir, `expected/${target.output}`),
        "utf8"
      );
      expect(target.content).toBe(expectedContent);
    }

    // Shared fragment appears in both targets
    const agentsMd = result.targets.find((t) => t.output === "AGENTS.md")!;
    const claudeMd = result.targets.find((t) => t.output === "CLAUDE.md")!;
    expect(agentsMd.content).toContain("Be concise and precise.");
    expect(claudeMd.content).toContain("Be concise and precise.");
    expect(agentsMd.content).toContain("frontend");
    expect(claudeMd.content).toContain("backend");

    // Lock has all three fragments, sorted by id
    expect(lock.fragments.map((f) => f.id)).toEqual([
      "_shared/010-tone.md",
      "backend/010-role.md",
      "frontend/010-role.md",
    ]);
  });

  it("front-matter: tags captured in lock, front-matter stripped from compiled body", async () => {
    const { result, lock, fixtureDir } = await runGolden("front-matter");

    const expectedLock = JSON.parse(
      readFileSync(path.join(fixtureDir, "expected/agentquilt.lock"), "utf8")
    );
    expect(lock).toEqual(expectedLock);

    const expectedContent = readFileSync(
      path.join(fixtureDir, "expected/AGENTS.md"),
      "utf8"
    );
    expect(result.targets[0].content).toBe(expectedContent);

    // Tags in lock
    expect(lock.fragments[0].tags).toEqual(["role", "safety"]);

    // Front-matter not in output
    expect(result.targets[0].content).not.toContain("---");
    expect(result.targets[0].content).not.toContain("tags:");

    // Body text present
    expect(result.targets[0].content).toContain("You are a helpful assistant.");
  });
});
