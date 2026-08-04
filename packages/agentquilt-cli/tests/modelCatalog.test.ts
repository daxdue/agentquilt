import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { readCodexModelCache, modelCatalogReaders } from "../src/core/modelCatalog.js";

describe("readCodexModelCache", () => {
  let dir: string;
  let originalCodexHome: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "aq-codex-home-"));
    originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = dir;
  });

  afterEach(() => {
    if (originalCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = originalCodexHome;
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns null when the cache file does not exist", () => {
    expect(readCodexModelCache()).toBeNull();
  });

  it("returns the set of model slugs from a valid cache", () => {
    writeFileSync(
      join(dir, "models_cache.json"),
      JSON.stringify({
        models: [{ slug: "gpt-5.6-sol" }, { slug: "gpt-5.6-terra" }, { slug: "gpt-5.6-luna" }],
      }),
      "utf8"
    );

    const slugs = readCodexModelCache();
    expect(slugs).not.toBeNull();
    expect(slugs).toEqual(new Set(["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]));
  });

  it("ignores entries with a missing or non-string slug", () => {
    writeFileSync(
      join(dir, "models_cache.json"),
      JSON.stringify({ models: [{ slug: "gpt-5.6-sol" }, { notASlug: true }, { slug: 42 }] }),
      "utf8"
    );

    expect(readCodexModelCache()).toEqual(new Set(["gpt-5.6-sol"]));
  });

  it("returns null for malformed JSON instead of throwing", () => {
    writeFileSync(join(dir, "models_cache.json"), "{ not valid json", "utf8");
    expect(() => readCodexModelCache()).not.toThrow();
    expect(readCodexModelCache()).toBeNull();
  });

  it("returns null when the top-level `models` field is not an array", () => {
    writeFileSync(join(dir, "models_cache.json"), JSON.stringify({ models: "oops" }), "utf8");
    expect(readCodexModelCache()).toBeNull();
  });

  it("respects CODEX_HOME for locating the cache file", () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "models_cache.json"),
      JSON.stringify({ models: [{ slug: "custom-home-model" }] }),
      "utf8"
    );
    expect(readCodexModelCache()).toEqual(new Set(["custom-home-model"]));
  });
});

describe("modelCatalogReaders", () => {
  it("registers a reader for codex", () => {
    expect(modelCatalogReaders.codex).toBeTypeOf("function");
  });

  it("has no registered reader for claude (aliases are stable, no cache to check)", () => {
    expect(modelCatalogReaders.claude).toBeUndefined();
  });
});
