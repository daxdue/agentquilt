import { z } from "zod";
import { SemVer, StatusEnum, MaturityEnum } from "./shared.js";

export const SectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().positive(),
});
export type Section = z.infer<typeof SectionSchema>;

export const ContextSchema = z.object({
  id: z.string().min(1),
  description: z.string().optional(),
});
export type Context = z.infer<typeof ContextSchema>;

export const CompileConfigSchema = z.object({
  output_path: z.string().default("generated/{id}.md"),
  include_metadata: z.boolean().default(false),
  include_block_comments: z.boolean().default(false),
});
export type CompileConfig = z.infer<typeof CompileConfigSchema>;

export const AgentManifestSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1),
  version: SemVer,
  status: StatusEnum.default("draft"),
  maturity: MaturityEnum.default("alpha"),
  owners: z.array(z.string()).min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  sections: z.record(z.string(), SectionSchema),
  contexts: z.array(ContextSchema).default([]),
  compile: CompileConfigSchema.optional(),
  imports: z.array(z.string()).default([]),
});

export type AgentManifest = z.infer<typeof AgentManifestSchema>;
