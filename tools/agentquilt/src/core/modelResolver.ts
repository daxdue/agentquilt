import { AgentDefinition } from "../schemas/agentDefinition.schema.js";
import { AgentQuiltConfig } from "../schemas/config.schema.js";
import { ConfigError } from "./configLoader.js";

export interface ResolvedModel {
  model: string | null;        // null = "inherit" → emit no model field
  reasoning: string | undefined;
}

export function resolveModel(
  definition: AgentDefinition,
  platform: string,
  config: AgentQuiltConfig
): ResolvedModel {
  const modelField = definition.model;

  // Step 1: Check overrides
  if (modelField && typeof modelField === "object" && modelField.overrides?.[platform]) {
    return {
      model: modelField.overrides[platform],
      reasoning: modelField.reasoning,
    };
  }

  // Step 2: Resolve tier
  let tier: string;
  if (modelField && typeof modelField === "object" && modelField.tier) {
    tier = modelField.tier;
  } else if (typeof modelField === "string") {
    tier = modelField;
  } else {
    // No model field; use defaultModelTier
    if (!config.defaultModelTier) {
      // When no tier available, return null (adapters decide at runtime)
      return { model: null, reasoning: undefined };
    }
    tier = config.defaultModelTier;
  }

  // Step 3: inherit
  if (tier === "inherit") {
    return {
      model: null,
      reasoning: modelField && typeof modelField === "object" ? modelField.reasoning : undefined,
    };
  }

  // Step 4: Lookup in modelTiers
  const tierMap = config.modelTiers?.[tier];
  if (!tierMap) {
    throw new ConfigError(`Unknown tier "${tier}" — not found in modelTiers config`);
  }
  const modelName = tierMap[platform];
  if (modelName === undefined) {
    throw new ConfigError(`Tier "${tier}" has no mapping for platform "${platform}"`);
  }

  // Step 5: reasoning
  const reasoning = modelField && typeof modelField === "object" ? modelField.reasoning : undefined;

  return { model: modelName, reasoning };
}
