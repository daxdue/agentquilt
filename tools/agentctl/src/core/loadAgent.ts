import { readFileSync } from "fs";
import { parse } from "yaml";
import { AgentManifestSchema, type AgentManifest } from "../schemas/index.js";
import { getManifestPath } from "../utils/paths.js";

export function loadAgent(agentPath: string): AgentManifest {
  const manifestPath = getManifestPath(agentPath);

  let content: string;
  try {
    content = readFileSync(manifestPath, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to read manifest at ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  let parsed: unknown;
  try {
    parsed = parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse YAML manifest: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    return AgentManifestSchema.parse(parsed);
  } catch (error) {
    throw new Error(
      `Manifest validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
