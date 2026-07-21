import { z } from "zod";

export const FragmentRecordSchema = z.object({
  id: z.string(),
  hash: z.string(),
  bytes: z.number(),
  tags: z.array(z.string()).optional().default([]),
});
export type FragmentRecord = z.infer<typeof FragmentRecordSchema>;

export const TargetLockSchema = z.object({
  output: z.string(),
  format: z.string(),
  fragments: z.array(z.string()),
  version: z.string(),
});
export type TargetLock = z.infer<typeof TargetLockSchema>;

export const AgentOutputRecordSchema = z.object({
  platform: z.string(),
  path: z.string(),
  // "region" is accepted for backward-compatible lock reads only. Current
  // adapters emit standalone files exclusively.
  kind: z.enum(["file", "region"]).default("file"),
  hash: z.string(),
});
export type AgentOutputRecord = z.infer<typeof AgentOutputRecordSchema>;

export const AgentLockRecordSchema = z.object({
  name: z.string(),
  dir: z.string(),                                   // repo-relative e.g. "agents/reviewer"
  bodyFragments: z.array(z.string()),                // ordered fragment IDs
  metaHash: z.string(),
  version: z.string(),                               // partial in Phase 2
  outputs: z.array(AgentOutputRecordSchema).default([]),  // filled by Phase 3/4
});
export type AgentLockRecord = z.infer<typeof AgentLockRecordSchema>;

export const AgentQuiltLockSchema = z.object({
  lockfileVersion: z.literal(1),
  formatVersion: z.literal("1"),
  fragments: z.array(FragmentRecordSchema),
  targets: z.array(TargetLockSchema),
  agents: z.array(AgentLockRecordSchema).default([]),  // NEW
});
export type AgentQuiltLock = z.infer<typeof AgentQuiltLockSchema>;
