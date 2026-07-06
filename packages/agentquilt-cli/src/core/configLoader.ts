import { readFileSync, existsSync, readdirSync } from "fs";
import { parse as parseYaml } from "yaml";
import { ZodError } from "zod";
import path from "path";
import {
  AgentQuiltConfig,
  AgentQuiltConfigSchema,
  PresetEnum,
  type Preset,
} from "../schemas/config.schema.js";
import { knownAdapters } from "./adapters/index.js";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const PRESET_DEFAULTS: Record<Preset, { output: string }> = {
  "agents-md": { output: "AGENTS.md" },
  claude: { output: "CLAUDE.md" },
  cursor: { output: ".cursor/rules/<agent>.mdc" },
  copilot: { output: ".github/copilot-instructions.md" },
  gemini: { output: "GEMINI.md" },
  agentskills: { output: ".agents/skills/<agent>/SKILL.md" },
};

/**
 * Config discovery order: .agentquilt/config.yaml, .agentquilt/config.json,
 * then the legacy root locations agentquilt.config.yaml, agentquilt.config.json.
 * Throws ConfigError if none exists.
 */
const CONFIG_SEARCH_ORDER = [
  ".agentquilt/config.yaml",
  ".agentquilt/config.json",
  "agentquilt.config.yaml",
  "agentquilt.config.json",
];

export function findConfigFile(cwd: string): string {
  for (const rel of CONFIG_SEARCH_ORDER) {
    const candidate = path.join(cwd, rel);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new ConfigError(
    "No .agentquilt/config.yaml (or legacy agentquilt.config.yaml) found in " + cwd
  );
}

/**
 * Load config from file (YAML or JSON, detected by extension).
 * Validate with Zod. Throw ConfigError on any failure.
 */
export function loadConfig(configPath: string): AgentQuiltConfig {
  if (!existsSync(configPath)) {
    throw new ConfigError(`Config file not found: ${configPath}`);
  }

  let raw: unknown;
  const ext = path.extname(configPath).toLowerCase();

  try {
    const content = readFileSync(configPath, "utf8");

    if (ext === ".yaml" || ext === ".yml") {
      raw = parseYaml(content);
    } else if (ext === ".json") {
      raw = JSON.parse(content);
    } else {
      throw new ConfigError(
        `Unknown config format. Expected .yaml or .json, got: ${ext}`
      );
    }
  } catch (err) {
    if (err instanceof ConfigError) throw err;
    throw new ConfigError(
      `Failed to parse config file ${configPath}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Apply preset defaults before schema validation so `output` can be omitted when `preset` is set
  if (raw && typeof raw === "object" && "targets" in raw && Array.isArray((raw as Record<string, unknown>).targets)) {
    for (const target of (raw as Record<string, unknown[]>).targets as Record<string, unknown>[]) {
      if (target && typeof target === "object" && target["preset"] && !target["output"]) {
        const defaults = resolvePreset(target["preset"] as string);
        if (defaults.output) {
          target["output"] = defaults.output;
        }
      }
    }
  }

  // Validate schema
  try {
    const config = AgentQuiltConfigSchema.parse(raw);
    return config;
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.errors
        .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
        .join("\n");
      throw new ConfigError(
        `Config validation failed:\n${issues}`
      );
    }
    throw err;
  }
}

/**
 * Resolve preset to default output/format (or empty if no preset).
 */
export function resolvePreset(preset?: string): { output?: string } {
  if (!preset) return {};
  try {
    PresetEnum.parse(preset);
    return PRESET_DEFAULTS[preset as Preset] || {};
  } catch {
    return {};
  }
}

/**
 * Validate config rules per v1 spec §5.3.
 * Logs warnings, throws ConfigError on validation failure.
 * Returns true if validation passes.
 */
export function validateConfig(config: AgentQuiltConfig, sourceDir: string): boolean {
  const errors: string[] = [];

  // Rule 1: version present and known (checked by Zod)

  // Rule 2: at least one target (checked by Zod)

  // Rule 3: no two targets share an output (document targets only)
  const outputs = new Set<string>();
  for (const target of config.targets) {
    if (target.kind !== "document") continue;
    if (outputs.has(target.output)) {
      errors.push(`Duplicate output path: ${target.output}`);
    }
    outputs.add(target.output);
  }

  // Rule 4: no output resolves inside sourceDir (document targets only)
  for (const target of config.targets) {
    if (target.kind !== "document") continue;
    const outputPath = path.normalize(target.output);
    const sourcePath = path.normalize(sourceDir);

    if (outputPath.startsWith(sourcePath + path.sep)) {
      errors.push(
        `Output path must not be inside sourceDir. Got: ${target.output} inside ${sourceDir}`
      );
    }
  }

  // Rule 5: every include names an existing directory (document targets only)
  // Security: validate includes do not escape sourceDir via path traversal
  for (const target of config.targets) {
    if (target.kind !== "document") continue;
    for (const includeName of target.include) {
      const resolvedBase = path.resolve(sourceDir);
      const agentPath = path.resolve(sourceDir, includeName);

      if (agentPath !== resolvedBase && !agentPath.startsWith(resolvedBase + path.sep)) {
        errors.push(
          `Include path escapes sourceDir (path traversal): "${includeName}"`
        );
        continue;
      }

      if (!existsSync(agentPath)) {
        errors.push(
          `Include references non-existent directory: ${sourceDir}/${includeName}`
        );
      }
    }
  }

  // Rule 6: empty agent directories = warning only (document targets only)
  for (const target of config.targets) {
    if (target.kind !== "document") continue;
    for (const includeName of target.include) {
      const resolvedBase = path.resolve(sourceDir);
      const agentPath = path.resolve(sourceDir, includeName);

      // Skip traversal paths (already caught in Rule 5)
      if (agentPath !== resolvedBase && !agentPath.startsWith(resolvedBase + path.sep)) {
        continue;
      }

      if (existsSync(agentPath)) {
        try {
          const files = readdirSync(agentPath, { withFileTypes: true })
            .filter((f) => f.name.endsWith(".md"))
            .filter((f) => f.isFile());

          if (files.length === 0) {
            console.warn(
              `Warning: agent directory is empty: ${sourceDir}/${includeName}`
            );
          }
        } catch {
          // Ignore read errors in validation
        }
      }
    }
  }

  // Additional validation for agent-definitions targets
  const agentErrors: string[] = [];

  for (const target of config.targets) {
    if (target.kind !== "agent-definitions") continue;

    // Use target-specific sourceDir if provided, otherwise use global sourceDir
    const targetSourceDir = target.sourceDir ? path.resolve(sourceDir, "..", target.sourceDir) : sourceDir;

    const agentNames = target.agents === "*"
      ? discoverAgentDirsForValidation(targetSourceDir).map((d) => path.basename(d))
      : target.agents;

    // Rule A: every agent resolves to dir with agent.yaml
    for (const agentName of agentNames) {
      const agentDir = path.join(targetSourceDir, agentName);
      const manifestPath = path.join(agentDir, "agent.yaml");
      if (!existsSync(manifestPath)) {
        agentErrors.push(
          `agent-definitions target: "${agentName}" has no agent.yaml at ${manifestPath}`
        );
      }
    }

    // Rule B: platform check (gated on knownAdapters count)
    const adapters = getKnownAdapters();
    if (adapters.length > 0) {
      for (const platform of target.platforms) {
        if (!adapters.includes(platform)) {
          agentErrors.push(
            `agent-definitions target: platform "${platform}" has no registered adapter`
          );
        }
      }
    }
  }

  // Rule C: global uniqueness of agent names (across all targets). Two
  // targets may intentionally list the same agent (e.g. compiling one record
  // for several platforms), so uniqueness is per source directory: the same
  // name in the same source root listed twice is fine, but two different
  // source roots must not both claim a name.
  const agentNameRoots = new Map<string, string>();
  for (const target of config.targets) {
    if (target.kind !== "agent-definitions") continue;
    const targetSourceDir = target.sourceDir ? path.resolve(sourceDir, "..", target.sourceDir) : sourceDir;
    const agentNames = target.agents === "*"
      ? discoverAgentDirsForValidation(targetSourceDir).map((d) => path.basename(d))
      : target.agents;
    for (const name of agentNames) {
      const existingRoot = agentNameRoots.get(name);
      if (existingRoot !== undefined && existingRoot !== targetSourceDir) {
        agentErrors.push(`Duplicate agent name: "${name}"`);
      }
      agentNameRoots.set(name, targetSourceDir);
    }
  }

  // Collect all errors and throw once
  if (agentErrors.length > 0) {
    errors.push(...agentErrors);
  }

  if (errors.length > 0) {
    throw new ConfigError("Config validation failed:\n  " + errors.join("\n  "));
  }

  return true;
}

function discoverAgentDirsForValidation(sourceDir: string): string[] {
  if (!existsSync(sourceDir)) {
    return [];
  }

  const entries = readdirSync(sourceDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) => existsSync(path.join(sourceDir, e.name, "agent.yaml")))
    .map((e) => e.name)
    .sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));

  return entries.map((name) => path.join(sourceDir, name));
}

function getKnownAdapters(): string[] {
  return knownAdapters();
}
