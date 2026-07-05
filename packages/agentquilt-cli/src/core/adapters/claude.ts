import { readFileSync } from "fs";
import { stringify as yamlStringify } from "yaml";
import { normalize } from "../normalize.js";
import { stripEmojis } from "./stripEmojis.js";
import { registerAdapter, type Adapter, type AdapterOutput } from "./index.js";
import type { CanonicalAgentRecord } from "../agentLoader.js";
import type { ResolvedModel } from "../modelResolver.js";

// v2: body is emitted verbatim per v1.1 §5 (Markdown headers and line
// structure preserved); previously headers were stripped and lines flattened
const ADAPTER_VERSION = "2";

function assembleBody(record: CanonicalAgentRecord): string {
  const bodies = record.bodyFragments.map((f) => {
    const raw = readFileSync(f.filePath);
    return stripEmojis(normalize(raw)); // Remove emojis per AGENTS.md/CLAUDE.md policy
  });
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

  // remaining x-claude keys (not tools, not permissionMode)
  for (const [k, v] of Object.entries(xc)) {
    if (k !== "tools" && k !== "permissionMode") {
      fm[k] = v;
    }
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
    // agentVersion is not available here; it's finalized in agentCompiler.
    // The HTML comment version will be filled by agentCompiler using the final version.
    // For now the adapter returns raw content and agentCompiler wraps it.
    const content = `---\n${frontmatter}---\n\n${body}`;
    return [{ path, content, kind: "file" }];
  },
};

registerAdapter(CLAUDE_ADAPTER);
