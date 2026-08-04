import { existsSync, readFileSync } from "fs";
import os from "os";
import path from "path";

// Best-effort readers for each platform's local model catalog. A reader must
// never throw: an unavailable or malformed cache means "unknown", not
// "error" — this module only ever produces advisory information, never a
// build-time dependency (see ADR on model-freshness advisories).
export type CatalogReader = () => Set<string> | null;

interface CodexModelsCache {
  models?: Array<{ slug?: unknown }>;
}

function codexHome(): string {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

export function readCodexModelCache(): Set<string> | null {
  const cachePath = path.join(codexHome(), "models_cache.json");
  if (!existsSync(cachePath)) return null;

  try {
    const raw = readFileSync(cachePath, "utf8");
    const parsed = JSON.parse(raw) as CodexModelsCache;
    if (!Array.isArray(parsed.models)) return null;

    const slugs = new Set<string>();
    for (const model of parsed.models) {
      if (typeof model.slug === "string") slugs.add(model.slug);
    }
    return slugs;
  } catch {
    return null;
  }
}

// Platforms with no entry here (e.g. "claude") have no known local catalog
// source; callers should treat that as "skipped", not a warning.
export const modelCatalogReaders: Record<string, CatalogReader> = {
  codex: readCodexModelCache,
};
