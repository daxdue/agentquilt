import { describe, it, expect } from "vitest";
import { resolveModel } from "../src/core/modelResolver";
import { AgentDefinition } from "../src/schemas/agentDefinition.schema";
import { AgentQuiltConfig } from "../src/schemas/config.schema";

describe("modelResolver", () => {
  const baseConfig: AgentQuiltConfig = {
    version: 1,
    sourceDir: "agents",
    targets: [],
  };

  it("should resolve tier shorthand to model name", () => {
    const def: AgentDefinition = {
      description: "Test",
      model: "balanced",
    };

    const config: AgentQuiltConfig = {
      ...baseConfig,
      modelTiers: {
        balanced: { claude: "claude-3-5-sonnet-20241022" },
      },
    };

    const resolved = resolveModel(def, "claude", config);
    expect(resolved.model).toBe("claude-3-5-sonnet-20241022");
    expect(resolved.reasoning).toBeUndefined();
  });

  it("should resolve expanded object with tier", () => {
    const def: AgentDefinition = {
      description: "Test",
      model: {
        tier: "frontier",
        reasoning: "high",
      },
    };

    const config: AgentQuiltConfig = {
      ...baseConfig,
      modelTiers: {
        frontier: { claude: "claude-opus-4" },
      },
    };

    const resolved = resolveModel(def, "claude", config);
    expect(resolved.model).toBe("claude-opus-4");
    expect(resolved.reasoning).toBe("high");
  });

  it("should use platform-specific override", () => {
    const def: AgentDefinition = {
      description: "Test",
      model: {
        tier: "balanced",
        overrides: {
          claude: "claude-opus-4-20250514",
        },
      },
    };

    const config: AgentQuiltConfig = {
      ...baseConfig,
      modelTiers: {
        balanced: { claude: "claude-3-5-sonnet-20241022" },
      },
    };

    const resolved = resolveModel(def, "claude", config);
    expect(resolved.model).toBe("claude-opus-4-20250514");
  });

  it("should handle inherit tier", () => {
    const def: AgentDefinition = {
      description: "Test",
      model: "inherit",
    };

    const resolved = resolveModel(def, "claude", baseConfig);
    expect(resolved.model).toBeNull();
  });

  it("should use default tier if no model specified", () => {
    const def: AgentDefinition = {
      description: "Test",
    };

    const config: AgentQuiltConfig = {
      ...baseConfig,
      defaultModelTier: "balanced",
      modelTiers: {
        balanced: { claude: "claude-3-5-sonnet-20241022" },
      },
    };

    const resolved = resolveModel(def, "claude", config);
    expect(resolved.model).toBe("claude-3-5-sonnet-20241022");
  });

  it("should return null when no model and no default", () => {
    const def: AgentDefinition = {
      description: "Test",
    };

    const resolved = resolveModel(def, "claude", baseConfig);
    expect(resolved.model).toBeNull();
  });

  it("should throw error for unknown tier", () => {
    const def: AgentDefinition = {
      description: "Test",
      model: "unknown-tier",
    };

    expect(() => resolveModel(def, "claude", baseConfig)).toThrow(
      "Unknown tier"
    );
  });

  it("should throw error for missing platform mapping", () => {
    const def: AgentDefinition = {
      description: "Test",
      model: "balanced",
    };

    const config: AgentQuiltConfig = {
      ...baseConfig,
      modelTiers: {
        balanced: { different_platform: "model-name" },
      },
    };

    expect(() => resolveModel(def, "claude", config)).toThrow(
      'no mapping for platform "claude"'
    );
  });
});
