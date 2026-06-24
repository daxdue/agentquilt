# Agent Invocation Integration

## Overview

GitHub Actions workflows (`.github/workflows/*.yml`) define the gate policies and entry points for AI agents. This document explains:

1. **Where agents are invoked** — gate policies → workflows
2. **What needs implementation** — Claude API integration layer
3. **How results flow back** — findings → GitHub comments/issues

---

## Current State (v0.2.0)

### Workflows Created

| Workflow | Trigger | Gate | Agents Involved |
|---|---|---|---|
| `intake.yml` | Issue opened | `intake-gate` | product-discovery/triage-agent |
| `pr-review.yml` | PR opened/updated | `pr-quality-gate` | code-review, eval-designer, security-review |
| `release.yml` | Manual dispatch | `release-gate` | release-manager, changelog, versioning, evidence-collector, post-release-review |

### What Works Today

- ✅ CI checks (typecheck, tests, coverage, drift detection)
- ✅ Placeholder agent invocation structure
- ✅ Mock findings posted to GitHub comments
- ✅ Authority boundaries documented (ADR-0004)

### What Needs Implementation

- ❌ Claude API invocation (requires Anthropic API key + integration)
- ❌ Agent context + prompt assembly from agent.yaml + markdown files
- ❌ Result parsing and GitHub comment posting
- ❌ Error handling and fallback behaviors

---

## Agent Invocation Architecture

### 1. Gate Policy → Workflow Mapping

Each gate policy in `policies/gates/*.yaml` has an `aiAssistance` block:

```yaml
# Example: intake-gate.yaml
aiAssistance:
  agents:
    - name: triage-agent
      role: Intake triage and deduplication
      tasks:
        - Summarize issue
        - Flag missing fields
        - Suggest risk level
        - Identify duplicates
```

The workflow reads this policy and:
1. Parses the agent name → resolves to `.agents/sdlc/product-discovery/`
2. Loads agent.yaml + 010-role.md + 020-triage-workflow.md
3. Constructs the agent prompt
4. Invokes Claude API
5. Posts findings as GitHub comment

### 2. Agent Context Construction

Pseudo-code for prompt assembly:

```typescript
// Load agent definition
const agent = loadYAML('.agents/sdlc/product-discovery/agent.yaml');
const role = loadMarkdown('.agents/sdlc/product-discovery/010-role.md');
const workflow = loadMarkdown('.agents/sdlc/product-discovery/020-triage-workflow.md');

// Construct prompt
const prompt = `
${agent.description}

${role}

${workflow}

---

TASK INPUT (from workflow):
${formatInput(github.event)}

INSTRUCTIONS:
1. Analyze the input per your workflow
2. Post findings structured as per your output format
3. Remember ADR-0004 authority boundaries
`;

// Invoke Claude API
const response = await claude.messages.create({
  model: agent.model,
  max_tokens: 4096,
  system: agent['x-claude'].context,
  messages: [{ role: 'user', content: prompt }]
});
```

### 3. Result Handling

Agent output expected format (structured):

```json
{
  "summary": "One-line summary",
  "findings": [
    {
      "type": "issue|suggestion|risk",
      "severity": "low|medium|high|critical",
      "message": "Detailed finding",
      "location": "file.ts:line (if applicable)",
      "suggestion": "How to fix (if applicable)"
    }
  ],
  "nextSteps": "Recommended action"
}
```

Workflow then:
1. Parses JSON response
2. Formats as GitHub comment
3. Posts to issue/PR
4. Tags maintainers if high/critical findings

---

## Implementation Roadmap

### Phase 3.1: API Integration Layer

Create `packages/agentquilt/src/integration/` with:

```typescript
// integration/claude-agent.ts
export async function invokeAgent(
  agentPath: string,      // e.g., '.agents/sdlc/product-discovery'
  gateName: string,       // e.g., 'intake-gate'
  taskInput: Record<string, unknown>  // e.g., { issue_number, title, body, ... }
): Promise<AgentResponse> {
  // 1. Load agent definition
  const agent = loadAgent(agentPath);
  
  // 2. Construct prompt from agent.yaml + markdown files
  const prompt = constructPrompt(agent, taskInput);
  
  // 3. Invoke Claude API
  const response = await client.messages.create({
    model: agent.model,
    max_tokens: 4096,
    system: agent['x-claude'].context,
    messages: [{ role: 'user', content: prompt }]
  });
  
  // 4. Parse and structure output
  return parseAgentResponse(response.content[0].text);
}

export interface AgentResponse {
  summary: string;
  findings: Finding[];
  nextSteps: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}
```

### Phase 3.2: GitHub Actions Integration

Create reusable action in `.github/actions/invoke-agent/`:

```yaml
# .github/actions/invoke-agent/action.yml
name: Invoke AI Agent
inputs:
  agent-path:
    description: Path to agent (e.g., .agents/sdlc/code-review)
  gate-name:
    description: Gate policy name (e.g., pr-quality-gate)
  task-input:
    description: JSON task input
outputs:
  findings:
    description: Agent findings JSON
runs:
  using: node20
  main: dist/index.js
```

Then workflows become:

```yaml
- name: Invoke code-review agent
  uses: ./.github/actions/invoke-agent
  with:
    agent-path: .agents/sdlc/code-review
    gate-name: pr-quality-gate
    task-input: |
      {
        "event": "pull_request",
        "diff": "${{ steps.get-diff.outputs.diff }}",
        "files": "${{ steps.get-files.outputs.files }}"
      }
```

### Phase 3.3: Workflow Automation

- **Intake workflow** — post triage findings; auto-label based on risk
- **PR workflow** — post code-review + eval + security comments; request changes if critical
- **Release workflow** — generate changelog/migration draft; require human approval before publish

### Phase 3.4: Error Handling & Fallbacks

- API timeout → post status update, don't block gate
- Agent response parse error → log failure, escalate to maintainers
- Rate limiting → queue agent invocation, retry with backoff
- Authorization failure → skip agent, log warning

---

## Deployment Checklist

- [ ] Create `packages/agentquilt/src/integration/claude-agent.ts`
- [ ] Add Anthropic API client to dependencies
- [ ] Create `.github/actions/invoke-agent/` action
- [ ] Add `ANTHROPIC_API_KEY` secret to GitHub Actions
- [ ] Update workflows to use invoke-agent action
- [ ] Test with a real issue/PR
- [ ] Document troubleshooting guide
- [ ] Set up monitoring for agent invocation failures

---

## Authority Model Enforcement

Each workflow enforces ADR-0004 boundaries:

| Agent Action | Allowed | Via Workflow |
|---|---|---|
| Review code/requirements | ✅ Yes | Post comments |
| Flag risks | ✅ Yes | Tag maintainers |
| Suggest changes | ✅ Yes | PR review comments |
| Approve PR | ❌ No | Workflow doesn't invoke approval |
| Merge | ❌ No | Requires human action |
| Release/publish | ❌ No | Requires human confirmation |

---

## Testing Integration

### Unit Tests

Test agent invocation in isolation:

```typescript
// integration.test.ts
test('invokeAgent returns structured response', async () => {
  const response = await invokeAgent(
    '.agents/sdlc/code-review',
    'pr-quality-gate',
    { diff: '...' }
  );
  
  expect(response).toHaveProperty('findings');
  expect(response.findings).toBeInstanceOf(Array);
});
```

### Integration Tests

Test workflow end-to-end:

```bash
# Create test PR with intentional issue
git checkout -b test/code-smell
# Make intentional security bug
git push origin test/code-smell
# PR created → workflow runs → code-review agent invoked
# Verify comment posted with findings
```

### Monitoring

Track agent performance:
- Invocation latency (target: <10s)
- Success rate (target: >95%)
- False positive rate (manually reviewed)
- Cost (API calls × model pricing)

---

## Next Steps

1. **Implement Phase 3.1** — Claude API integration layer
2. **Test with pilot gate** — start with intake workflow (lowest risk)
3. **Gather feedback** — review agent findings on real issues
4. **Iterate** — improve prompts based on feedback
5. **Roll out systematically** — PR → release workflows
6. **Monitor & optimize** — track performance, adjust as needed

See `.docs/integration/phase3-timeline.md` for detailed roadmap.
