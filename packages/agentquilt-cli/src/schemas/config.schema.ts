import { z } from "zod";

export const PresetEnum = z.enum([
  "agents-md",
  "claude",
  "cursor",
  "copilot",
  "gemini",
  "agentskills",
]);
export type Preset = z.infer<typeof PresetEnum>;

// Document target (existing)
export const DocumentTargetSchema = z.object({
  kind: z.literal("document").default("document"),
  output: z.string(),
  // Empty is valid (freshly scaffolded preset targets start with no agents);
  // build warns and emits a header-only document until directories are listed.
  include: z.array(z.string()).default([]),
  preset: PresetEnum.optional(),
  format: z.string().default("markdown"),
});

// Agent-definitions target (new in Phase 2)
export const AgentDefinitionsTargetSchema = z.object({
  kind: z.literal("agent-definitions"),
  // Override global sourceDir; resolved against the parent of the global
  // sourceDir (e.g. "meta-agents" → .agentquilt/meta-agents by default)
  sourceDir: z.string().optional(),
  agents: z.union([z.array(z.string()), z.literal("*")]),
  platforms: z.array(z.string()).min(1),  // REQUIRED, at least one platform
  outputPaths: z.record(z.string()).optional(),  // per-platform override (Phase 3)
});

// Union of all target types
export const TargetSchema = z.union([DocumentTargetSchema, AgentDefinitionsTargetSchema]);
export type Target = z.infer<typeof TargetSchema>;

export const AgentQuiltConfigSchema = z.object({
  version: z.literal(1),
  sourceDir: z.string().default(".agentquilt/agents"),
  defaultModelTier: z.string().optional(),
  modelTiers: z.record(z.record(z.string())).optional(),  // tier → { platform → model }
  targets: z.array(TargetSchema).min(1),
});
export type AgentQuiltConfig = z.infer<typeof AgentQuiltConfigSchema>;
