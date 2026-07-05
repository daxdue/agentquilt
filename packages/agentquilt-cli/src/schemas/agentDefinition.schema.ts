import { z } from "zod";

const TierEnum = z.enum(["frontier", "balanced", "fast", "inherit"]);
const ReasoningEnum = z.enum(["low", "medium", "high"]);
export const PermissionsEnum = z.enum(["read-only", "workspace", "full"]);

// model field: bare tier shorthand string OR expanded object OR null/undefined
const ModelSchema = z.union([
  TierEnum,
  z.object({
    tier: TierEnum.optional(),
    reasoning: ReasoningEnum.optional(),
    overrides: z.record(z.string()).optional(),
  }),
]).optional();

// name becomes a path component in adapter outputs (.claude/agents/<name>.md),
// so it must never contain separators or dot segments
export const AgentNameSchema = z.string().regex(
  /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
  "agent name must start with an alphanumeric and contain only alphanumerics, '.', '_' or '-'"
).refine((n) => n !== "." && n !== ".." && !n.includes(".."), {
  message: "agent name must not contain '..'",
});

export const AgentDefinitionSchema = z.object({
  description: z.string().min(1),
  name: AgentNameSchema.optional(),      // default = dir basename
  model: ModelSchema,
  permissions: PermissionsEnum.optional(),  // NO default; if omitted, tool asks at runtime
}).catchall(z.unknown());                // accepts x-claude, x-codex, etc.

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
