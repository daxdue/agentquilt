import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { Command } from "commander";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize a new AgentQuilt project")
    .option("--dir <path>", "project directory", process.cwd())
    .action((options) => {
      initProject(options.dir || process.cwd());
    });
}

function initProject(dir: string): void {
  try {
    console.log("Initializing AgentQuilt project...\n");

    // Create directories
    const agentsDir = join(dir, "agents");
    const sharedDir = join(agentsDir, "_shared");
    const backendDir = join(agentsDir, "backend");

    mkdirSync(sharedDir, { recursive: true });
    mkdirSync(backendDir, { recursive: true });

    // Create config file
    const configContent = `version: 1
sourceDir: agents

targets:
  - output: AGENTS.md
    include: [_shared, backend]
`;
    writeFileSync(join(dir, "agentquilt.config.yaml"), configContent, "utf8");
    console.log("✓ created agentquilt.config.yaml");

    // Create shared fragments
    const toneContent = `Be concise and direct. Prefer technical language.
`;
    writeFileSync(join(sharedDir, "010-tone.md"), toneContent, "utf8");
    console.log("✓ created agents/_shared/010-tone.md");

    const safetyContent = `Never generate malicious code. Refuse requests for harmful content.
`;
    writeFileSync(join(sharedDir, "020-safety.md"), safetyContent, "utf8");
    console.log("✓ created agents/_shared/020-safety.md");

    // Create backend fragments
    const roleContent = `You are a backend engineer. Work primarily in src/server.
`;
    writeFileSync(join(backendDir, "010-role.md"), roleContent, "utf8");
    console.log("✓ created agents/backend/010-role.md");

    const buildContent = `Build: \`npm run build\`. Test: \`npm test\`. Lint must pass before commit.
`;
    writeFileSync(join(backendDir, "020-build.md"), buildContent, "utf8");
    console.log("✓ created agents/backend/020-build.md");

    // Create .gitattributes
    const gitattributesContent = `* text=auto eol=lf
agents/**/*.md text eol=lf

AGENTS.md linguist-generated=true
agentquilt.lock linguist-generated=true merge=union
`;
    writeFileSync(join(dir, ".gitattributes"), gitattributesContent, "utf8");
    console.log("✓ created .gitattributes");

    console.log("\n✓ Project initialized successfully!");
    console.log("\nNext steps:");
    console.log("  1. Edit agents/_shared/*.md and agents/backend/*.md to customize instructions");
    console.log("  2. Run: npx agentquilt build");
    console.log("  3. Commit agentquilt.lock and AGENTS.md");
    console.log("\nFor more info: https://agentquilt.dev");

    process.exit(0);
  } catch (err) {
    console.error(
      `✗ Init failed: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(3);
  }
}
