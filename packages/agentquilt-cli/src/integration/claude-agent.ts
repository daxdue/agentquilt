import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { resolve } from "path";

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  maxRetries: number;
  backoffMs: number;
}

interface InvocationLog {
  timestamp: string;
  agentName: string;
  gateName: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
  status: "success" | "error";
  errorMessage?: string;
}

class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.config.windowSeconds * 1000;

    // Remove old requests outside window
    this.requests = this.requests.filter((t) => t > windowStart);

    // Check if we can proceed
    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitMs =
        oldestRequest + this.config.windowSeconds * 1000 - now;
      console.log(`Rate limit: waiting ${Math.ceil(waitMs)}ms...`);
      await new Promise((resolve) =>
        setTimeout(resolve, Math.ceil(waitMs))
      );
      return this.acquire(); // retry
    }

    this.requests.push(now);
  }
}

function logInvocation(log: InvocationLog): void {
  console.log(JSON.stringify(log));
}

// Default: 10 requests per minute
// Can be overridden via AGENT_RATE_LIMIT environment variable
const getRateLimiterConfig = (): RateLimitConfig => {
  const isTest = process.env.NODE_ENV === "test";
  return {
    maxRequests: isTest ? 1000 : parseInt(process.env.AGENT_RATE_LIMIT || "10"),
    windowSeconds: 60,
    maxRetries: 3,
    backoffMs: 1000,
  };
};

const limiter = new RateLimiter(getRateLimiterConfig());

/**
 * Structured response from an agent invocation.
 * Agents return findings, recommendations, and context-specific data.
 */
export interface AgentFinding {
  type: "issue" | "suggestion" | "risk";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  location?: string;
  suggestion?: string;
}

export interface AgentResponse {
  summary: string;
  findings: AgentFinding[];
  nextSteps: string;
  riskLevel?: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
}

export interface AgentInvocationInput {
  event?: string; // e.g., "pull_request", "issues"
  [key: string]: unknown;
}

/**
 * Load and parse a compiled agent definition from .claude/agents/<name>.md
 * Returns: { systemPrompt, metadata }
 */
export function loadAgentDefinition(
  agentName: string,
  baseDir = "."
): { systemPrompt: string; metadata: Record<string, unknown> } {
  const agentPath = resolve(baseDir, `.claude/agents/${agentName}.md`);

  const content = readFileSync(agentPath, "utf8");

  // Parse YAML frontmatter and body
  const lines = content.split("\n");
  let fmStart = -1;
  let fmEnd = -1;

  // Find frontmatter boundaries
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      if (fmStart === -1) {
        fmStart = i;
      } else {
        fmEnd = i;
        break;
      }
    }
  }

  if (fmStart === -1 || fmEnd === -1) {
    throw new Error(`Invalid agent format: ${agentName} missing YAML frontmatter`);
  }

  // Extract frontmatter and body
  const fmLines = lines.slice(fmStart + 1, fmEnd);
  const bodyLines = lines.slice(fmEnd + 1);

  // Parse YAML frontmatter (simple parsing, not full YAML)
  const metadata: Record<string, unknown> = {};
  for (const line of fmLines) {
    const match = line.match(/^([\w-]+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      metadata[key] = value.trim();
    }
  }

  // System prompt is the body (plain text after frontmatter)
  const systemPrompt = bodyLines.join("\n").trim();

  return { systemPrompt, metadata };
}

/**
 * Invoke a Claude agent via the Anthropic API.
 *
 * @param agentPath - Path to agent (e.g., '.agents/sdlc/code-review')
 * @param gateName - Gate policy name (e.g., 'pr-quality-gate')
 * @param taskInput - Task input object (e.g., { diff: "...", files: [...] })
 * @returns Agent response with findings and recommendations
 */
export async function invokeAgent(
  agentPath: string,
  gateName: string,
  taskInput: AgentInvocationInput
): Promise<AgentResponse> {
  const startTime = Date.now();
  const agentName = agentPath.split("/").pop();
  if (!agentName) {
    throw new Error(`Invalid agent path: ${agentPath}`);
  }

  let agentDef;
  let response;
  let errorMessage: string | undefined;

  try {
    // Load agent definition
    try {
      agentDef = loadAgentDefinition(agentName);
    } catch (err) {
      throw new Error(`Failed to load agent ${agentName}: ${err}`);
    }

    // Construct user prompt
    const userPrompt = `
Gate: ${gateName}
Agent: ${agentPath}

Task Input:
${JSON.stringify(taskInput, null, 2)}

Please analyze and provide findings according to your role and authority boundaries.
`;

    // Apply rate limiting
    await limiter.acquire();

    // Initialize Anthropic client
    const client = new Anthropic();

    // Call Claude API with retry logic
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        response = await client.messages.create({
          model: (agentDef.metadata.model as string) || "claude-sonnet-4-6",
          max_tokens: 4096,
          system: agentDef.systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
        });
        break; // success
      } catch (err) {
        lastError = err as Error;
        if (
          err instanceof Error &&
          (err.message.includes("429") ||
            err.message.includes("rate limit"))
        ) {
          if (attempt < 3) {
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.log(
              `Rate limited. Retrying after ${backoffMs}ms... (attempt ${attempt + 1}/3)`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, backoffMs)
            );
            continue;
          }
        }
        throw err;
      }
    }

    if (!response) {
      throw lastError || new Error("Failed to get API response");
    }

    // Extract text response
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse response into structured format
    const agentResponse = parseAgentResponse(textContent.text);

    // Log successful invocation
    const durationMs = Date.now() - startTime;
    logInvocation({
      timestamp: new Date().toISOString(),
      agentName,
      gateName,
      model: (agentDef.metadata.model as string) || "claude-sonnet-4-6",
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      durationMs,
      status: "success",
    });

    return agentResponse;
  } catch (err) {
    // Log failed invocation
    const durationMs = Date.now() - startTime;
    errorMessage = err instanceof Error ? err.message : String(err);
    logInvocation({
      timestamp: new Date().toISOString(),
      agentName,
      gateName,
      model: (agentDef?.metadata.model as string) || "claude-sonnet-4-6",
      durationMs,
      status: "error",
      errorMessage,
    });

    throw err;
  }
}

/**
 * Parse agent response text into structured AgentResponse format.
 * Expects format like:
 *   SUMMARY: ...
 *   FINDINGS:
 *   - type: issue, severity: high, message: ...
 *   RISK LEVEL: medium
 */
export function parseAgentResponse(responseText: string): AgentResponse {
  const lines = responseText.split("\n");
  const findings: AgentFinding[] = [];
  let summary = "";
  let nextSteps = "";
  let riskLevel: "low" | "medium" | "high" | "critical" | undefined;

  let inFindings = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    if (line.startsWith("SUMMARY:")) {
      summary = line.replace("SUMMARY:", "").trim();
    } else if (line.startsWith("RISK LEVEL:")) {
      const level = line.replace("RISK LEVEL:", "").trim().toLowerCase();
      if (["low", "medium", "high", "critical"].includes(level)) {
        riskLevel = level as typeof riskLevel;
      }
    } else if (line.startsWith("FINDINGS:")) {
      inFindings = true;
    } else if (line.startsWith("NEXT STEPS:") || line.startsWith("RECOMMENDATIONS:")) {
      inFindings = false;
      nextSteps = line
        .replace(/^(NEXT STEPS|RECOMMENDATIONS):/, "")
        .trim();
    } else if (inFindings && line.startsWith("-")) {
      // Parse finding
      const finding = parseFinding(line);
      if (finding) {
        findings.push(finding);
      }
    } else if (nextSteps && !inFindings) {
      nextSteps += " " + line;
    }
  }

  // Fallback: if response is unstructured, treat entire response as summary
  if (!summary) {
    summary = responseText.substring(0, 200);
  }

  return {
    summary: summary || "Agent analysis complete",
    findings,
    nextSteps: nextSteps || "Review agent findings above",
    riskLevel,
  };
}

/**
 * Parse a single finding line.
 * Expected format: "- type: issue, severity: high, message: ..."
 */
export function parseFinding(line: string): AgentFinding | null {
  const match = line.match(
    /type:\s*(\w+)\s*,\s*severity:\s*(\w+)\s*,\s*message:\s*(.+?)(?:\s*,\s*location:\s*(.+?))?(?:\s*,\s*suggestion:\s*(.+))?$/
  );

  if (!match) {
    return null;
  }

  const [, type, severity, message, location, suggestion] = match;

  if (!["issue", "suggestion", "risk"].includes(type)) {
    return null;
  }

  if (!["low", "medium", "high", "critical"].includes(severity)) {
    return null;
  }

  return {
    type: type as AgentFinding["type"],
    severity: severity as AgentFinding["severity"],
    message: message.trim(),
    location: location?.trim(),
    suggestion: suggestion?.trim(),
  };
}
