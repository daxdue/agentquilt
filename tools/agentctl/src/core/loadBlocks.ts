import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import { InstructionBlockSchema, type InstructionBlock } from "../schemas/index.js";
import { getInstructionsPath } from "../utils/paths.js";

export function loadBlocks(agentPath: string): InstructionBlock[] {
  const instructionsPath = getInstructionsPath(agentPath);

  let files: string[];
  try {
    files = readdirSync(instructionsPath)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
      .sort();
  } catch (error) {
    throw new Error(
      `Failed to read instructions directory ${instructionsPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const blocks: InstructionBlock[] = [];

  for (const file of files) {
    const filePath = join(instructionsPath, file);

    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to read block file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    let parsed: unknown;
    try {
      parsed = parse(content);
    } catch (error) {
      throw new Error(
        `Failed to parse YAML in ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    try {
      const block = InstructionBlockSchema.parse(parsed);
      blocks.push(block);
    } catch (error) {
      throw new Error(
        `Block validation failed in ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return blocks;
}
