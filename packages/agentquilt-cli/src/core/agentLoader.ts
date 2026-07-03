import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import { AgentDefinitionSchema, type AgentDefinition } from "../schemas/agentDefinition.schema.js";
import { ConfigError } from "./configLoader.js";

export interface BodyFragment {
  id: string;       // repo-relative POSIX path
  filePath: string; // absolute
  fileName: string;
}

export interface CanonicalAgentRecord {
  name: string;                // yaml.name ?? dir basename
  dir: string;                 // repo-relative POSIX path
  definition: AgentDefinition;
  bodyFragments: BodyFragment[];
}

export function loadAgentDir(agentDirPath: string, repoRoot: string): CanonicalAgentRecord {
  const manifestPath = path.join(agentDirPath, "agent.yaml");

  if (!existsSync(manifestPath)) {
    throw new ConfigError(`Agent directory missing agent.yaml: ${manifestPath}`);
  }

  // Read and parse agent.yaml
  const raw = readFileSync(manifestPath, "utf8");
  let definition: AgentDefinition;
  try {
    const parsed = parseYaml(raw);
    definition = AgentDefinitionSchema.parse(parsed);
  } catch (err) {
    throw new ConfigError(
      `Failed to parse agent.yaml at ${manifestPath}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Resolve name
  const dirBasename = path.basename(agentDirPath);
  const name = definition.name ?? dirBasename;

  // Discover body fragments (.md files, byte-lex sorted, excluding agent.yaml)
  const bodyFragments: BodyFragment[] = [];
  const mdFiles = readdirSync(agentDirPath)
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));

  for (const fileName of mdFiles) {
    const filePath = path.join(agentDirPath, fileName);
    const id = path.relative(repoRoot, filePath).replace(/\\/g, "/");

    // Warn on unprefixed files
    if (!fileName.match(/^\d{3}-/)) {
      console.warn(`Warning: fragment has no prefix: ${id}`);
    }

    bodyFragments.push({ id, filePath, fileName });
  }

  // Repo-relative dir path
  const dir = path.relative(repoRoot, agentDirPath).replace(/\\/g, "/");

  return { name, dir, definition, bodyFragments };
}

export function discoverAgentDirs(sourceDir: string): string[] {
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

export function resolveAgents(
  agents: string[] | "*",
  sourceDir: string,
  repoRoot: string
): CanonicalAgentRecord[] {
  const agentNames = agents === "*"
    ? discoverAgentDirs(sourceDir).map((d) => path.basename(d))
    : agents;

  const records: CanonicalAgentRecord[] = [];
  const seenNames = new Set<string>();

  for (const agentName of agentNames) {
    const agentDir = path.join(sourceDir, agentName);
    const record = loadAgentDir(agentDir, repoRoot);

    // Check for duplicate names
    if (seenNames.has(record.name)) {
      throw new ConfigError(`Duplicate agent name: "${record.name}"`);
    }
    seenNames.add(record.name);

    records.push(record);
  }

  // Sort by name (byte order)
  records.sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)));

  return records;
}
