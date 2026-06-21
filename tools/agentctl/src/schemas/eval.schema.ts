import { z } from "zod";
import { StatusEnum, RiskEnum } from "./shared.js";

export const PromptPresenceExpectedSchema = z.object({
  must_include: z.array(z.string()).default([]),
  must_not_include: z.array(z.string()).default([]),
});
export type PromptPresenceExpected = z.infer<
  typeof PromptPresenceExpectedSchema
>;

export const PromptPresenceEvalSchema = z.object({
  id: z.string().min(1),
  agent: z.string().min(1),
  name: z.string().min(1),
  kind: z.literal("prompt_presence"),
  status: StatusEnum.default("draft"),
  risk: RiskEnum.default("medium"),
  expected: PromptPresenceExpectedSchema,
});

export type PromptPresenceEval = z.infer<typeof PromptPresenceEvalSchema>;

export const LiveLlmExpectedSchema = z.object({
  rubric: z.string().min(1),
  minimum_score: z.number().min(0).max(10),
});
export type LiveLlmExpected = z.infer<typeof LiveLlmExpectedSchema>;

export const LiveLlmEvalSchema = z.object({
  id: z.string().min(1),
  agent: z.string().min(1),
  name: z.string().min(1),
  kind: z.literal("live_llm"),
  status: StatusEnum.default("draft"),
  risk: RiskEnum.default("medium"),
  input: z.string().min(1),
  expected: LiveLlmExpectedSchema,
});

export type LiveLlmEval = z.infer<typeof LiveLlmEvalSchema>;

export const EvalSchema = z.union([PromptPresenceEvalSchema, LiveLlmEvalSchema]);
export type Eval = z.infer<typeof EvalSchema>;
