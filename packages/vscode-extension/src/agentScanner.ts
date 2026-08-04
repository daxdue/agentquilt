import * as fs from "fs";
import * as path from "path";
import { parse as parseYaml } from "yaml";
import { AgentNode } from "./model";

/**
 * Fallback for when no agentquilt.lock exists yet (e.g. right after `agentquilt
 * init`, before the first build). Scans sourceDir for agent directories the same
 * way the CLI's agentLoader does: a directory qualifies if it has an agent.yaml,
 * its fragments are the *.md files (excluding agent.yaml itself) sorted
 * byte-lexicographically, and its name defaults to the directory basename.
 */
export function scanAgents(workspaceRoot: string, sourceDir: string): AgentNode[] {
  const sourceDirAbs = path.join(workspaceRoot, sourceDir);
  if (!fs.existsSync(sourceDirAbs)) return [];

  const entries = fs.readdirSync(sourceDirAbs, { withFileTypes: true });
  const agents: AgentNode[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirAbs = path.join(sourceDirAbs, entry.name);
    const manifestAbs = path.join(dirAbs, "agent.yaml");
    if (!fs.existsSync(manifestAbs)) continue;

    let name = entry.name;
    try {
      const manifest = parseYaml(fs.readFileSync(manifestAbs, "utf8")) as Record<string, unknown>;
      if (typeof manifest?.name === "string") name = manifest.name;
    } catch {
      // Malformed agent.yaml: fall back to the directory basename as name.
    }

    const fragments = fs
      .readdirSync(dirAbs)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((f) => path.relative(workspaceRoot, path.join(dirAbs, f)));

    agents.push({
      name,
      dir: path.relative(workspaceRoot, dirAbs),
      fragments,
      outputs: [],
    });
  }

  return agents;
}
