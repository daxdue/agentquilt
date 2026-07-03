import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  invokeAgent,
  loadAgentDefinition,
  parseAgentResponse,
  parseFinding,
  AgentFinding,
  AgentResponse,
  AgentInvocationInput,
} from "../src/integration/claude-agent";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { resolve } from "path";

// Mock fs and Anthropic
vi.mock("fs");
vi.mock("@anthropic-ai/sdk");

describe("claude-agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadAgentDefinition", () => {
    it("should parse valid agent file with YAML frontmatter", () => {
      const mockContent = `---
name: code-review
description: Review code for quality
model: sonnet
tools: Read, Grep
---
You are a code review expert.
Review the provided code for:
- Correctness
- Security
- Performance`;

      vi.mocked(readFileSync).mockReturnValue(mockContent);

      const result = loadAgentDefinition("code-review");

      expect(result.systemPrompt).toContain("You are a code review expert");
      expect(result.metadata.name).toBe("code-review");
      expect(result.metadata.model).toBe("sonnet");
    });

    it("should throw error if frontmatter is missing", () => {
      const mockContent = `No frontmatter here
Just plain text`;

      vi.mocked(readFileSync).mockReturnValue(mockContent);

      expect(() => loadAgentDefinition("invalid-agent")).toThrow(
        "Invalid agent format"
      );
    });

    it("should extract metadata from YAML frontmatter", () => {
      const mockContent = `---
name: eval-designer
description: Design evals
model: opus
tools: Read, Grep, Glob
custom-field: custom-value
---
Design behavioral evals for agents`;

      vi.mocked(readFileSync).mockReturnValue(mockContent);

      const result = loadAgentDefinition("eval-designer");

      expect(result.metadata.name).toBe("eval-designer");
      expect(result.metadata.model).toBe("opus");
      expect(result.metadata["custom-field"]).toBe("custom-value");
    });

    it("should extract system prompt from body after frontmatter", () => {
      const mockContent = `---
name: security-review
model: sonnet
---
You are a security expert.
Review code for:
- Vulnerabilities
- Authentication flaws
- Data leaks`;

      vi.mocked(readFileSync).mockReturnValue(mockContent);

      const result = loadAgentDefinition("security-review");

      expect(result.systemPrompt).toContain("security expert");
      expect(result.systemPrompt).toContain("Vulnerabilities");
      expect(result.systemPrompt).not.toContain("---");
      expect(result.systemPrompt).not.toContain("name:");
    });
  });

  describe("invokeAgent", { timeout: 10000 }, () => {
    it("should successfully invoke agent and return structured response", async () => {
      const mockAgentContent = `---
name: code-review
description: Review code for quality
model: sonnet
tools: Read, Grep
---
You are a code review expert. Review the provided code carefully.`;

      const mockApiResponse = {
        content: [
          {
            type: "text",
            text: `SUMMARY: Code review complete
FINDINGS:
- type: issue, severity: medium, message: Missing error handling in parseJSON function
- type: suggestion, severity: low, message: Consider adding type hints for better IDE support
RISK LEVEL: medium
NEXT STEPS: Address the error handling issue before merging`,
          },
        ],
      };

      vi.mocked(readFileSync).mockReturnValue(mockAgentContent);
      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: {
              create: vi.fn().mockResolvedValue(mockApiResponse),
            },
          }) as any
      );

      const result = await invokeAgent(
        ".agents/sdlc/code-review",
        "pr-quality-gate",
        {
          event: "pull_request",
          diff: "some code diff",
          files: ["src/index.ts"],
        }
      );

      expect(result).toBeDefined();
      expect(result.summary).toContain("Code review complete");
      expect(result.findings).toHaveLength(2);
      expect(result.findings[0].type).toBe("issue");
      expect(result.findings[1].type).toBe("suggestion");
      expect(result.riskLevel).toBe("medium");
    });

    it("should throw error if agent file not found", async () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      await expect(
        invokeAgent(".agents/sdlc/nonexistent-agent", "pr-quality-gate", {})
      ).rejects.toThrow("Failed to load agent");
    });

    it("should throw error if API call fails", async () => {
      const mockAgentContent = `---
name: code-review
model: sonnet
---
Review code`;

      vi.mocked(readFileSync).mockReturnValue(mockAgentContent);
      const mockCreate = vi
        .fn()
        .mockRejectedValueOnce(new Error("API connection failed"));
      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: {
              create: mockCreate,
            },
          }) as any
      );

      await expect(
        invokeAgent(".agents/sdlc/code-review", "pr-quality-gate", {})
      ).rejects.toThrow("API connection failed");
    });

    it("should throw error if no text response from API", async () => {
      const mockAgentContent = `---
name: code-review
model: sonnet
---
Review code`;

      const mockApiResponse = {
        content: [{ type: "image", url: "https://example.com/image.png" }],
      };

      vi.mocked(readFileSync).mockReturnValue(mockAgentContent);
      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: {
              create: vi.fn().mockResolvedValue(mockApiResponse),
            },
          }) as any
      );

      await expect(
        invokeAgent(".agents/sdlc/code-review", "pr-quality-gate", {})
      ).rejects.toThrow("No text response from Claude");
    });

    it("should extract agent name from full path", async () => {
      const mockAgentContent = `---
name: eval-designer
model: sonnet
---
Design evals`;

      const mockApiResponse = {
        content: [{ type: "text", text: "SUMMARY: Eval design complete\nFINDINGS:\nRISK LEVEL: low" }],
      };

      vi.mocked(readFileSync).mockReturnValue(mockAgentContent);
      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: {
              create: vi.fn().mockResolvedValue(mockApiResponse),
            },
          }) as any
      );

      await invokeAgent(
        ".agents/stlc/eval-designer",
        "pr-quality-gate",
        {}
      );

      expect(readFileSync).toHaveBeenCalledWith(
        expect.stringContaining("eval-designer.md"),
        "utf8"
      );
    });

    it("should throw error if agent path is invalid", async () => {
      await expect(
        invokeAgent("", "pr-quality-gate", {})
      ).rejects.toThrow("Invalid agent path");
    });

    it("should use default model if not specified in metadata", async () => {
      const mockAgentContent = `---
name: code-review
---
Review code`;

      const mockApiResponse = {
        content: [{ type: "text", text: "SUMMARY: Done\nFINDINGS:\nRISK LEVEL: low" }],
      };

      vi.mocked(readFileSync).mockReturnValue(mockAgentContent);
      const mockCreate = vi.fn().mockResolvedValue(mockApiResponse);
      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as any
      );

      await invokeAgent(".agents/sdlc/code-review", "pr-quality-gate", {});

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-sonnet-4-6",
        })
      );
    });

    it("should use specified model from metadata", async () => {
      const mockAgentContent = `---
name: code-review
model: opus
---
Review code`;

      const mockApiResponse = {
        content: [{ type: "text", text: "SUMMARY: Done\nFINDINGS:\nRISK LEVEL: low" }],
      };

      vi.mocked(readFileSync).mockReturnValue(mockAgentContent);
      const mockCreate = vi.fn().mockResolvedValue(mockApiResponse);
      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: { create: mockCreate },
          }) as any
      );

      await invokeAgent(".agents/sdlc/code-review", "pr-quality-gate", {});

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "opus",
        })
      );
    });
  });

  describe("parseAgentResponse", () => {
    it("should parse structured response with all fields", () => {
      const responseText = `SUMMARY: Code review identified 2 issues
FINDINGS:
- type: issue, severity: high, message: SQL injection vulnerability in query builder
- type: suggestion, severity: low, message: Add JSDoc comments to exported functions
RISK LEVEL: high
NEXT STEPS: Fix security vulnerability before merging. Consider adding tests for input validation.`;

      const result = parseAgentResponse(responseText);

      expect(result.summary).toBe("Code review identified 2 issues");
      expect(result.findings).toHaveLength(2);
      expect(result.riskLevel).toBe("high");
      expect(result.nextSteps).toContain("Fix security");
    });

    it("should handle response with missing optional fields", () => {
      const responseText = `SUMMARY: Review complete
FINDINGS:
- type: issue, severity: medium, message: Missing tests`;

      const result = parseAgentResponse(responseText);

      expect(result.summary).toBe("Review complete");
      expect(result.findings).toHaveLength(1);
      expect(result.riskLevel).toBeUndefined();
      expect(result.nextSteps).toBe("Review agent findings above");
    });

    it("should handle response with location and suggestion in finding", () => {
      const responseText = `SUMMARY: Security review
FINDINGS:
- type: issue, severity: high, message: Missing error handling, location: src/api.ts:42, suggestion: Wrap in try-catch block
RISK LEVEL: medium`;

      const result = parseAgentResponse(responseText);

      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].location).toBe("src/api.ts:42");
      expect(result.findings[0].suggestion).toBe("Wrap in try-catch block");
    });

    it("should handle unstructured response gracefully", () => {
      const responseText = `The code looks good overall. I found a couple of minor issues but nothing critical.`;

      const result = parseAgentResponse(responseText);

      expect(result.summary).toContain("The code looks good");
      expect(result.findings).toHaveLength(0);
      expect(result.nextSteps).toBe("Review agent findings above");
    });

    it("should extract multiple findings from FINDINGS section", () => {
      const responseText = `SUMMARY: Multi-issue review
FINDINGS:
- type: issue, severity: critical, message: Hardcoded database password
- type: issue, severity: high, message: No input validation
- type: suggestion, severity: low, message: Use const instead of let
- type: risk, severity: medium, message: Dependency version mismatch
RISK LEVEL: critical`;

      const result = parseAgentResponse(responseText);

      expect(result.findings).toHaveLength(4);
      expect(result.findings[0].severity).toBe("critical");
      expect(result.findings[2].type).toBe("suggestion");
      expect(result.findings[3].type).toBe("risk");
    });

    it("should handle risk level in lowercase", () => {
      const responseText = `SUMMARY: Review done
RISK LEVEL: critical
FINDINGS:`;

      const result = parseAgentResponse(responseText);

      expect(result.riskLevel).toBe("critical");
    });

    it("should handle risk level in uppercase by normalizing", () => {
      const responseText = `SUMMARY: Review done
RISK LEVEL: CRITICAL
FINDINGS:`;

      const result = parseAgentResponse(responseText);

      expect(result.riskLevel).toBe("critical");
    });

    it("should ignore invalid risk levels", () => {
      const responseText = `SUMMARY: Review done
RISK LEVEL: extreme
FINDINGS:`;

      const result = parseAgentResponse(responseText);

      expect(result.riskLevel).toBeUndefined();
    });
  });

  describe("parseFinding", () => {
    it("should parse complete finding with all optional fields", () => {
      const line =
        "- type: issue, severity: high, message: SQL injection in query, location: src/db.ts:45, suggestion: Use parameterized queries";

      const result = parseFinding(line);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("issue");
      expect(result?.severity).toBe("high");
      expect(result?.message).toBe("SQL injection in query");
      expect(result?.location).toBe("src/db.ts:45");
      expect(result?.suggestion).toBe("Use parameterized queries");
    });

    it("should parse finding with only required fields", () => {
      const line = "- type: suggestion, severity: low, message: Add documentation";

      const result = parseFinding(line);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("suggestion");
      expect(result?.severity).toBe("low");
      expect(result?.message).toBe("Add documentation");
      expect(result?.location).toBeUndefined();
      expect(result?.suggestion).toBeUndefined();
    });

    it("should return null for invalid type", () => {
      const line = "- type: invalid, severity: low, message: This is bad";

      const result = parseFinding(line);

      expect(result).toBeNull();
    });

    it("should return null for invalid severity", () => {
      const line = "- type: issue, severity: catastrophic, message: Problem";

      const result = parseFinding(line);

      expect(result).toBeNull();
    });

    it("should parse all valid types", () => {
      const types = ["issue", "suggestion", "risk"];

      for (const type of types) {
        const line = `- type: ${type}, severity: medium, message: Test`;
        const result = parseFinding(line);
        expect(result?.type).toBe(type);
      }
    });

    it("should parse all valid severities", () => {
      const severities = ["low", "medium", "high", "critical"];

      for (const severity of severities) {
        const line = `- type: issue, severity: ${severity}, message: Test`;
        const result = parseFinding(line);
        expect(result?.severity).toBe(severity);
      }
    });

    it("should return null for malformed finding", () => {
      const line = "- This is not a properly formatted finding";

      const result = parseFinding(line);

      expect(result).toBeNull();
    });

    it("should trim whitespace from parsed values", () => {
      const line =
        "- type:  issue , severity:  high , message:  SQL injection ";

      const result = parseFinding(line);

      expect(result?.type).toBe("issue");
      expect(result?.severity).toBe("high");
      expect(result?.message).toBe("SQL injection");
    });
  });

  describe("AgentResponse structure", () => {
    it("should have required fields", () => {
      const response: AgentResponse = {
        summary: "Review complete",
        findings: [],
        nextSteps: "Merge when ready",
      };

      expect(response.summary).toBeDefined();
      expect(response.findings).toBeDefined();
      expect(response.nextSteps).toBeDefined();
    });

    it("should have optional fields", () => {
      const response: AgentResponse = {
        summary: "Review complete",
        findings: [],
        nextSteps: "Merge when ready",
        riskLevel: "high",
        metadata: { checkCount: 5, passCount: 5 },
      };

      expect(response.riskLevel).toBe("high");
      expect(response.metadata).toBeDefined();
    });
  });

  describe("AgentFinding structure", () => {
    it("should have required fields", () => {
      const finding: AgentFinding = {
        type: "issue",
        severity: "high",
        message: "Security vulnerability",
      };

      expect(finding.type).toBeDefined();
      expect(finding.severity).toBeDefined();
      expect(finding.message).toBeDefined();
    });

    it("should have optional fields", () => {
      const finding: AgentFinding = {
        type: "suggestion",
        severity: "low",
        message: "Improve readability",
        location: "src/utils.ts:23",
        suggestion: "Add comments",
      };

      expect(finding.location).toBeDefined();
      expect(finding.suggestion).toBeDefined();
    });

    it("should enforce valid type values", () => {
      const validTypes: Array<"issue" | "suggestion" | "risk"> = [
        "issue",
        "suggestion",
        "risk",
      ];

      expect(validTypes).toContain("issue");
      expect(validTypes).toContain("suggestion");
      expect(validTypes).toContain("risk");
    });

    it("should enforce valid severity values", () => {
      const validSeverities: Array<"low" | "medium" | "high" | "critical"> = [
        "low",
        "medium",
        "high",
        "critical",
      ];

      expect(validSeverities).toContain("low");
      expect(validSeverities).toContain("critical");
    });
  });

  describe("Integration scenarios", () => {
    it("should handle code review agent workflow", async () => {
      const mockAgentContent = `---
name: code-review
model: sonnet
tools: Read, Grep
---
You are a code review expert. Review PRs for correctness, security, and performance.`;

      const mockApiResponse = {
        content: [
          {
            type: "text",
            text: `SUMMARY: Found 3 issues in PR #42
FINDINGS:
- type: issue, severity: critical, message: SQL injection in query builder, location: src/db.ts:67, suggestion: Use parameterized queries
- type: issue, severity: high, message: Missing input validation on user email field, location: src/users/create.ts:23
- type: suggestion, severity: low, message: Consider adding JSDoc comments for exported functions
RISK LEVEL: high
NEXT STEPS: Address security issues (SQL injection and input validation) before merging. Add tests to verify fixes.`,
          },
        ],
      };

      vi.mocked(readFileSync).mockReturnValue(mockAgentContent);
      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: {
              create: vi.fn().mockResolvedValue(mockApiResponse),
            },
          }) as any
      );

      const result = await invokeAgent(
        ".agents/sdlc/code-review",
        "pr-quality-gate",
        {
          event: "pull_request",
          pr_number: 42,
          diff: "/* code diff */",
        }
      );

      expect(result.summary).toContain("3 issues");
      expect(result.findings).toHaveLength(3);
      expect(result.findings[0].severity).toBe("critical");
      expect(result.riskLevel).toBe("high");
    });

    it("should handle eval designer agent workflow", async () => {
      const mockAgentContent = `---
name: eval-designer
model: sonnet
---
Design and validate behavioral evals for agents.`;

      const mockApiResponse = {
        content: [
          {
            type: "text",
            text: `SUMMARY: Eval suite validated successfully
FINDINGS:
- type: suggestion, severity: low, message: Consider adding baseline for new agent output format
RISK LEVEL: low
NEXT STEPS: No changes required. Eval suite is comprehensive.`,
          },
        ],
      };

      vi.mocked(readFileSync).mockReturnValue(mockAgentContent);
      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: {
              create: vi.fn().mockResolvedValue(mockApiResponse),
            },
          }) as any
      );

      const result = await invokeAgent(
        ".agents/stlc/eval-designer",
        "pr-quality-gate",
        {
          event: "pull_request",
          files_changed: ["agents/code-review/010-role.md"],
        }
      );

      expect(result.riskLevel).toBe("low");
      expect(result.findings).toHaveLength(1);
    });

    it("should handle security review agent workflow", async () => {
      const mockAgentContent = `---
name: security-review
model: sonnet
---
Review PRs for security vulnerabilities and compliance issues.`;

      const mockApiResponse = {
        content: [
          {
            type: "text",
            text: `SUMMARY: Security review completed - 1 critical issue found
FINDINGS:
- type: issue, severity: critical, message: Hardcoded API key in environment file, location: .env.example:5, suggestion: Move to GitHub Actions secret and use process.env
RISK LEVEL: critical
NEXT STEPS: Remove hardcoded credentials before merging. Rotate affected API key.`,
          },
        ],
      };

      vi.mocked(readFileSync).mockReturnValue(mockAgentContent);
      vi.mocked(Anthropic).mockImplementation(
        () =>
          ({
            messages: {
              create: vi.fn().mockResolvedValue(mockApiResponse),
            },
          }) as any
      );

      const result = await invokeAgent(
        ".agents/governance/security-review",
        "pr-quality-gate",
        {
          event: "pull_request",
          diff: "/* code changes */",
        }
      );

      expect(result.riskLevel).toBe("critical");
      expect(result.findings[0].severity).toBe("critical");
    });
  });
});
