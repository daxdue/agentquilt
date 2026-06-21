import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getProjectRoot(): string {
  // From tools/agentctl/src/utils/paths.ts, go up 4 levels to repo root
  return join(__dirname, "../../../../");
}

export function getAgentPath(agentId: string): string {
  return join(getProjectRoot(), "agents", agentId);
}

export function getManifestPath(agentPath: string): string {
  return join(agentPath, "agent.yaml");
}

export function getInstructionsPath(agentPath: string): string {
  return join(agentPath, "instructions");
}

export function getGeneratedPath(agentPath: string): string {
  return join(agentPath, "generated");
}

export function getEvalsPath(agentPath: string): string {
  return join(agentPath, "evals");
}
