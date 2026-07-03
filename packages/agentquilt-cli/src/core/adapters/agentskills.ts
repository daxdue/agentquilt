import { readFileSync } from "fs";
import { stringify as yamlStringify } from "yaml";
import { normalize } from "../normalize.js";
import { registerAdapter, type Adapter, type AdapterOutput } from "./index.js";
import type { CanonicalAgentRecord } from "../agentLoader.js";

const ADAPTER_VERSION = "1";

// Strip emojis, smileys, and pictographic symbols
// Policy: Generated files (AGENTS.md, SKILL.md, etc.) must not contain emojis or smileys
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

function toKebabCase(s: string): string {
  return s
    // Insert hyphen before uppercase letters (camelCase → camel-Case)
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    // Convert to lowercase
    .toLowerCase()
    // Replace non-alphanumeric-hyphen characters with hyphens
    .replace(/[^a-z0-9-]/g, "-")
    // Collapse multiple hyphens
    .replace(/-+/g, "-")
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, "");
}

function assembleBody(record: CanonicalAgentRecord): string {
  const bodies = record.bodyFragments.map((f) => {
    const raw = readFileSync(f.filePath);
    const normalized = normalize(raw);
    return stripEmojis(normalized); // Remove emojis per policy
  });
  return bodies.join("\n") + "\n";
}

function buildFrontmatter(record: CanonicalAgentRecord): string {
  const def = record.definition;
  const xAgentSkills = (def as Record<string, unknown>)["x-agentskills"];
  const xas =
    xAgentSkills && typeof xAgentSkills === "object"
      ? ((xAgentSkills as Record<string, unknown>) || {})
      : {};

  const fm: Record<string, unknown> = {};
  const name = toKebabCase(record.name);
  fm["name"] = name;
  fm["description"] = def.description;

  if (xas["license"] !== undefined) {
    fm["license"] = xas["license"];
  }

  if (xas["compatibility"] !== undefined) {
    fm["compatibility"] = xas["compatibility"];
  }

  if (xas["allowed-tools"] !== undefined) {
    fm["allowed-tools"] = xas["allowed-tools"];
  }

  if (xas["metadata"] !== undefined) {
    fm["metadata"] = xas["metadata"];
  }

  return yamlStringify(fm);
}

export const AGENTSKILLS_ADAPTER: Adapter = {
  id: "agentskills",
  ADAPTER_VERSION,
  outputsFor(record, _resolvedModel, _config): AdapterOutput[] {
    const name = toKebabCase(record.name);
    const path = `.agents/skills/${name}/SKILL.md`;
    const frontmatter = buildFrontmatter(record);
    const body = assembleBody(record);
    const content = `---\n${frontmatter}---\n\n${body}`;
    return [{ path, content, kind: "file" }];
  },
};

registerAdapter(AGENTSKILLS_ADAPTER);
