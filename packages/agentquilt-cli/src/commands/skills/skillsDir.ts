import path from "path";
import { ConfigError, findConfigFile, loadConfig } from "../../core/configLoader.js";

export const DEFAULT_SKILLS_DIR = ".agentquilt/skills";

/**
 * Skills live in a `skills/` directory that is a sibling of the configured
 * agents sourceDir — the same way per-target `sourceDir` overrides resolve
 * against the parent of the global sourceDir (see build watch roots).
 */
export function resolveSkillsDir(cwd: string, configPath?: string): string {
  try {
    const config = loadConfig(configPath || findConfigFile(cwd));
    return path.join(path.dirname(config.sourceDir), "skills");
  } catch (err) {
    if (err instanceof ConfigError && !configPath) {
      return DEFAULT_SKILLS_DIR;
    }
    throw err;
  }
}
