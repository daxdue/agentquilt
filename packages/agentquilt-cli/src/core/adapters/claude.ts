import { readFileSync } from "fs";
import { stringify as yamlStringify } from "yaml";
import { normalize } from "../normalize.js";
import { ConfigError } from "../configLoader.js";
import { registerAdapter, type Adapter, type AdapterOutput } from "./index.js";
import type { CanonicalAgentRecord } from "../agentLoader.js";
import type { ResolvedModel } from "../modelResolver.js";

// v2: body is emitted verbatim per v1.1 §5 — no content transformation of
// user fragments (previously headers were stripped and lines flattened)
const ADAPTER_VERSION = "2";

// Canonical fields buildFrontmatter sets unconditionally, with no override
// mechanism. "tools" and "permissionMode" are deliberately NOT reserved —
// x-claude.tools / x-claude.permissionMode are the sanctioned override
// channel (v1.1 addendum §5.1).
const CLAUDE_RESERVED_EXTENSION_KEYS = new Set(["name", "description", "model", "effort"]);

function assembleBody(record: CanonicalAgentRecord): string {
  const bodies = record.bodyFragments.map((f) => normalize(readFileSync(f.filePath)));
  // normalize() ensures each body ends with exactly one \n; joining with "\n"
  // therefore puts one blank line between fragments (v1 document body rules)
  return bodies.join("\n");
}

// Map full model names to tier shortnames for Claude Code format
function modelToTierName(fullModelName: string | null): string | null {
  if (!fullModelName) return null;
  if (fullModelName.includes("opus")) return "opus";
  if (fullModelName.includes("sonnet")) return "sonnet";
  if (fullModelName.includes("haiku")) return "haiku";
  return fullModelName; // fallback to original if unrecognized
}

function buildFrontmatter(
  record: CanonicalAgentRecord,
  resolvedModel: ResolvedModel
): string {
  const def = record.definition;
  const xClaude = (def as Record<string, unknown>)["x-claude"];
  const xc =
    xClaude && typeof xClaude === "object"
      ? ((xClaude as Record<string, unknown>) || {})
      : {};

  const fm: Record<string, unknown> = {};
  fm["name"] = record.name;
  fm["description"] = def.description;

  if (resolvedModel.model !== null) {
    fm["model"] = modelToTierName(resolvedModel.model);
  }

  // tools: x-claude.tools override wins; else derive from permissions
  if (xc["tools"] !== undefined) {
    fm["tools"] = xc["tools"];
  } else if (def.permissions === "read-only" || def.permissions === undefined) {
    fm["tools"] = "Read, Grep, Glob";
  }
  // workspace: no tools line; full: no tools line

  // permissionMode: x-claude.permissionMode override wins; else derive from permissions
  if (xc["permissionMode"] !== undefined) {
    fm["permissionMode"] = xc["permissionMode"];
  } else if (def.permissions === "full") {
    fm["permissionMode"] = "acceptEdits";
  }

  // effort from reasoning
  if (resolvedModel.reasoning !== undefined) {
    fm["effort"] = resolvedModel.reasoning;
  }

  // remaining x-claude keys (not tools, not permissionMode) pass through
  // verbatim, except canonical field names, which are rejected rather than
  // silently overwriting the value already set above.
  for (const [k, v] of Object.entries(xc)) {
    if (k === "tools" || k === "permissionMode") continue;
    if (CLAUDE_RESERVED_EXTENSION_KEYS.has(k)) {
      throw new ConfigError(
        `Agent "${record.name}" x-claude key "${k}" collides with a canonical Claude field`
      );
    }
    fm[k] = v;
  }

  return yamlStringify(fm); // ends with \n
}

export const CLAUDE_ADAPTER: Adapter = {
  id: "claude",
  ADAPTER_VERSION,
  outputsFor(record, resolvedModel, _config): AdapterOutput[] {
    const path = `.claude/agents/${record.name}.md`;
    const frontmatter = buildFrontmatter(record, resolvedModel);
    const body = assembleBody(record);
    // The adapter owns the exact output bytes. Provenance and version metadata
    // live in the lock so YAML frontmatter remains at byte zero.
    const content = `---\n${frontmatter}---\n\n${body}`;
    return [{ path, content, kind: "file" }];
  },
};

registerAdapter(CLAUDE_ADAPTER);
