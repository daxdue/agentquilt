import { readFileSync } from "fs";
import { stringify as yamlStringify } from "yaml";
import { normalize } from "../normalize.js";
import { registerAdapter, type Adapter, type AdapterOutput } from "./index.js";
import type { CanonicalAgentRecord } from "../agentLoader.js";
import type { ResolvedModel } from "../modelResolver.js";

const ADAPTER_VERSION = "1";

// Strip emojis, smileys, and pictographic symbols
// Policy: AGENTS.md and CLAUDE.md must not contain emojis or smileys
function stripEmojis(text: string): string {
  // Remove emoji and emoticon patterns
  return text
    // Extended emoji ranges with variation selectors
    .replace(/[\u{1F000}-\u{1F9FF}][\u{FE00}-\u{FE0F}]?/gu, "") // Main emoji + optional variation selector
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "") // Additional emoji coverage
    .replace(/[\u{2300}-\u{27BF}][\u{FE00}-\u{FE0F}]?/gu, "") // Misc symbols + variation selector
    .replace(/[\u{2B50}]/gu, "") // Stars
    .replace(/[\u{2705}-\u{274C}]/gu, "") // Check marks, X marks, etc
    .replace(/\u{200D}/gu, "") // Zero-width joiner
    .replace(/\u{200B}/gu, "") // Zero-width space
    .replace(/\u{FE00}-\u{FE0F}/gu, "") // Variation selectors alone
    // Text emoticons (colon or semicolon based)
    .replace(/\s*[:;][-=]?[)D(pP\\/|@:*'`~]\s*/g, " ") // :) :( ;) :D etc with optional dash/equal
    .replace(/\s*[-=][-=]?[)D(P\\/]\s*/g, " ") // -) =) etc
    // Cleanup: normalize multiple spaces to single space
    .replace(/\s+/g, " ")
    .trim();
}

// Strip Markdown headers and convert to plain system prompt text
function stripMarkdownHeaders(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.match(/^#+\s+/)) // Remove lines that are Markdown headers
    .join("\n")
    .replace(/\n\n+/g, "\n\n") // Normalize multiple blank lines to single blank line
    .trim();
}

function assembleBody(record: CanonicalAgentRecord): string {
  const bodies = record.bodyFragments.map((f) => {
    const raw = readFileSync(f.filePath);
    const normalized = normalize(raw);
    const withoutHeaders = stripMarkdownHeaders(normalized);
    return stripEmojis(withoutHeaders); // Remove emojis per AGENTS.md/CLAUDE.md policy
  });
  // join with blank line
  return bodies.join("\n\n") + "\n";
}
// Note: normalize() ensures each body fragment ends with exactly one \n.
// Joining with "\n\n" inserts a blank line between fragments.
// stripMarkdownHeaders removes Markdown headers to produce plain system prompt text.

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
