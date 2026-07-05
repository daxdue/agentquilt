import { readFileSync } from "fs";
import { stringify as yamlStringify } from "yaml";
import { normalize } from "../normalize.js";
import { stripEmojis } from "./stripEmojis.js";
import { registerAdapter, type Adapter, type AdapterOutput } from "./index.js";
import type { CanonicalAgentRecord } from "../agentLoader.js";

// v2: body is emitted verbatim per v1.1 §7 (line structure preserved,
// blank line between fragments); previously lines were flattened
const ADAPTER_VERSION = "2";

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
    return stripEmojis(normalize(raw)); // Remove emojis per policy
  });
  // normalize() ensures each body ends with exactly one \n; joining with "\n"
  // therefore puts one blank line between fragments (v1 document body rules)
  return bodies.join("\n");
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
