import { canonicalizeText } from "../utils/format.js";
import type { AgentManifest, InstructionBlock } from "../schemas/index.js";

export interface RenderOptions {
  includeBlockComments?: boolean;
}

export function renderMarkdown(
  manifest: AgentManifest,
  blocks: InstructionBlock[],
  options: RenderOptions = {}
): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${manifest.name}`);
  lines.push("");

  if (manifest.description) {
    lines.push(manifest.description);
    lines.push("");
  }

  // Group blocks by section
  const sectionMap = new Map<string, InstructionBlock[]>();
  const sectionOrder = Object.entries(manifest.sections);

  for (const [_, section] of sectionOrder) {
    sectionMap.set(section.id, []);
  }

  for (const block of blocks) {
    const blocks_ = sectionMap.get(block.section);
    if (blocks_) {
      blocks_.push(block);
    }
  }

  // Render each section
  for (const [_, section] of sectionOrder) {
    const sectionBlocks = sectionMap.get(section.id) ?? [];

    if (sectionBlocks.length === 0) {
      continue;
    }

    lines.push(`## ${section.title}`);
    lines.push("");

    for (const block of sectionBlocks) {
      if (options.includeBlockComments) {
        lines.push(`<!-- Block: ${block.id}`);
        lines.push(`Type: ${block.type}`);
        lines.push(`Owner: ${block.owner}`);
        lines.push(`Risk: ${block.risk}`);
        lines.push(`Status: ${block.status}`);
        lines.push(`-->`);
      }

      if (block.summary) {
        lines.push(`### ${block.summary}`);
        lines.push("");
      }

      lines.push(block.text);
      lines.push("");
    }
  }

  return canonicalizeText(lines.join("\n"));
}
