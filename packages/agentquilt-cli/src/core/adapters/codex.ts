import { readFileSync } from "fs";
import { stringify as tomlStringify } from "smol-toml";
import { normalize } from "../normalize.js";
import { ConfigError } from "../configLoader.js";
import { byteCompare } from "../sortUtil.js";
import { registerAdapter, type Adapter, type AdapterOutput } from "./index.js";
import type { CanonicalAgentRecord } from "../agentLoader.js";
import type { ResolvedModel } from "../modelResolver.js";

const ADAPTER_VERSION = "2";
const PROVENANCE = "# agentquilt: generated file - do not edit; regenerate: agentquilt build\n";
const RESERVED_EXTENSION_KEYS = new Set([
  "name",
  "description",
  "developer_instructions",
  "model",
  "model_reasoning_effort",
  "sandbox_mode",
]);
const ALLOWED_EXTENSION_KEYS = new Set(["nickname_candidates", "skills"]);

function assembleBody(record: CanonicalAgentRecord): string {
  return record.bodyFragments
    .map((fragment) => normalize(readFileSync(fragment.filePath)))
    .join("\n");
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value === null || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  const sorted = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(value).sort(byteCompare)) {
    sorted[key] = sortValue((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

function invalidField(
  record: CanonicalAgentRecord,
  field: string,
  detail: string
): never {
  throw new ConfigError(`Agent "${record.name}" field "${field}" ${detail}`);
}

function nicknameCandidates(
  record: CanonicalAgentRecord,
  value: unknown
): string[] {
  const field = "x-codex.nickname_candidates";
  if (!Array.isArray(value) || value.length === 0) {
    return invalidField(record, field, "must be a non-empty array");
  }

  const seen = new Set<string>();
  return value.map((candidate, index) => {
    const itemField = `${field}[${index}]`;
    if (typeof candidate !== "string") {
      return invalidField(record, itemField, "must be a string");
    }

    const normalized = candidate.trim();
    if (normalized.length === 0) {
      return invalidField(record, itemField, "must not be blank");
    }
    if (!/^[A-Za-z0-9 _-]+$/.test(normalized)) {
      return invalidField(
        record,
        itemField,
        "may contain only ASCII letters, digits, spaces, hyphens, and underscores"
      );
    }
    if (seen.has(normalized)) {
      return invalidField(
        record,
        itemField,
        `duplicates nickname candidate "${normalized}"`
      );
    }

    seen.add(normalized);
    return normalized;
  });
}

function skillsConfig(
  record: CanonicalAgentRecord,
  value: unknown
): Record<string, unknown> {
  const field = "x-codex.skills";
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return invalidField(record, field, "must be an object");
  }

  const skills = value as Record<string, unknown>;
  for (const key of Object.keys(skills).sort(byteCompare)) {
    if (key !== "config") {
      return invalidField(record, `${field}.${key}`, "is not supported");
    }
  }
  if (!Object.prototype.hasOwnProperty.call(skills, "config")) {
    return invalidField(record, `${field}.config`, "is required");
  }
  if (!Array.isArray(skills.config)) {
    return invalidField(record, `${field}.config`, "must be an array");
  }

  const config = skills.config.map((entry, index) => {
    const entryField = `${field}.config[${index}]`;
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return invalidField(record, entryField, "must be an object");
    }

    const rawEntry = entry as Record<string, unknown>;
    for (const key of Object.keys(rawEntry).sort(byteCompare)) {
      if (key !== "path" && key !== "enabled") {
        return invalidField(record, `${entryField}.${key}`, "is not supported");
      }
    }
    if (!Object.prototype.hasOwnProperty.call(rawEntry, "path")) {
      return invalidField(record, `${entryField}.path`, "is required");
    }
    if (typeof rawEntry.path !== "string") {
      return invalidField(record, `${entryField}.path`, "must be a string");
    }

    const normalizedPath = rawEntry.path.trim();
    if (normalizedPath.length === 0) {
      return invalidField(record, `${entryField}.path`, "must not be blank");
    }
    if (
      Object.prototype.hasOwnProperty.call(rawEntry, "enabled") &&
      typeof rawEntry.enabled !== "boolean"
    ) {
      return invalidField(record, `${entryField}.enabled`, "must be a boolean");
    }

    const normalized = Object.create(null) as Record<string, unknown>;
    if (rawEntry.enabled !== undefined) {
      normalized.enabled = rawEntry.enabled;
    }
    normalized.path = normalizedPath;
    return normalized;
  });

  return sortValue({ config }) as Record<string, unknown>;
}

function extensionFields(record: CanonicalAgentRecord): Record<string, unknown> {
  const raw = (record.definition as Record<string, unknown>)["x-codex"];
  if (raw === undefined) return {};
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ConfigError(`Agent "${record.name}" field "x-codex" must be an object`);
  }

  const extension = raw as Record<string, unknown>;
  const sorted = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(extension).sort(byteCompare)) {
    if (RESERVED_EXTENSION_KEYS.has(key)) {
      throw new ConfigError(
        `Agent "${record.name}" x-codex key "${key}" collides with a canonical Codex field`
      );
    }
    if (!ALLOWED_EXTENSION_KEYS.has(key)) {
      throw new ConfigError(
        `Agent "${record.name}" x-codex key "${key}" is not supported; ` +
          `allowed keys: nickname_candidates, skills`
      );
    }
    switch (key) {
      case "nickname_candidates":
        sorted[key] = nicknameCandidates(record, extension[key]);
        break;
      case "skills":
        sorted[key] = skillsConfig(record, extension[key]);
        break;
    }
  }
  return sorted;
}

function sandboxMode(record: CanonicalAgentRecord): string {
  switch (record.definition.permissions) {
    case "workspace":
      return "workspace-write";
    case "full":
      return "danger-full-access";
    case "read-only":
    case undefined:
      return "read-only";
  }
}

function serialize(
  record: CanonicalAgentRecord,
  resolvedModel: ResolvedModel
): string {
  const description = record.definition.description;
  if (description.trim().length === 0) {
    invalidField(record, "description", "must not be blank");
  }

  const developerInstructions = assembleBody(record);
  if (developerInstructions.trim().length === 0) {
    invalidField(record, "developer_instructions", "must not be blank");
  }

  const fields = Object.create(null) as Record<string, unknown>;
  fields.name = record.name;
  fields.description = description;
  fields.developer_instructions = developerInstructions;

  if (resolvedModel.model !== null) {
    fields.model = resolvedModel.model;
  }
  if (resolvedModel.reasoning !== undefined) {
    fields.model_reasoning_effort = resolvedModel.reasoning;
  }
  fields.sandbox_mode = sandboxMode(record);

  Object.assign(fields, extensionFields(record));

  try {
    return PROVENANCE + tomlStringify(fields as Parameters<typeof tomlStringify>[0]);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Unable to serialize Codex agent "${record.name}": ${detail}`);
  }
}

export const CODEX_ADAPTER: Adapter = {
  id: "codex",
  ADAPTER_VERSION,
  outputsFor(record, resolvedModel, _config): AdapterOutput[] {
    return [
      {
        path: `.codex/agents/${record.name}.toml`,
        content: serialize(record, resolvedModel),
        kind: "file",
      },
    ];
  },
};

registerAdapter(CODEX_ADAPTER);
