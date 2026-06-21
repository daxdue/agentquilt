import { z } from "zod";
import {
  StatusEnum,
  TypeEnum,
  RiskEnum,
  PriorityEnum,
} from "./shared.js";

export const AppliesWhenSchema = z.object({
  context: z.string().min(1),
  channel: z.string().optional(),
});
export type AppliesWhen = z.infer<typeof AppliesWhenSchema>;

export const InstructionBlockSchema = z.object({
  id: z.string().min(1),
  agent: z.string().min(1),
  type: TypeEnum,
  section: z.string().min(1),
  owner: z.string().min(1),
  status: StatusEnum.default("draft"),
  priority: PriorityEnum.default("medium"),
  risk: RiskEnum.default("medium"),
  summary: z.string().min(1),
  rationale: z.string().optional(),
  text: z.string().min(1),
  tags: z.array(z.string()).default([]),
  applies_when: AppliesWhenSchema.optional(),
  conflicts_with: z.array(z.string()).default([]),
  supersedes: z.array(z.string()).default([]),
  created_by: z.string().optional(),
  updated_by: z.string().optional(),
  traceability: z.record(z.string()).optional(),
});

export type InstructionBlock = z.infer<typeof InstructionBlockSchema>;
