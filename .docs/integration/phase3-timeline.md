# Phase 3: Agent Integration Timeline

## Overview

Phase 3 transforms the gate policies and meta-agents from documentation into operational reality. Three GitHub Actions workflows provide entry points for agent invocation.

**Status:** Phase 3.0 (Scaffolding) ✅ COMPLETE — All 46 agents now discoverable in Claude Code

---

## Phase 3.0: Complete (DONE ✅)

### Gate Policies & Meta-Agents Scaffolded

- ✅ 5 gate policy YAML files with aiAssistance blocks
- ✅ 33 meta-agents defined (agent.yaml + 010-role.md + 020-workflow.md)
- ✅ Risk register with 6 active risks
- ✅ SDLC/STLC documentation complete

### GitHub Actions Workflows Templated

- ✅ `.github/workflows/intake.yml` — Issue intake with triage-agent
- ✅ `.github/workflows/pr-review.yml` — PR review with code-review + eval + security agents
- ✅ `.github/workflows/release.yml` — Release orchestration with release-manager

**Deliverable:** All workflows have placeholder agent invocation with mock findings.

---

## Phase 3.1: API Integration Layer (1-2 weeks)

### Objective

Build the bridge between GitHub Actions workflows and Claude API.

### Tasks

#### 3.1.1: Create Claude Agent Client
- File: `packages/agentquilt/src/integration/claude-agent.ts`
- Implement `invokeAgent(agentPath, gateName, taskInput) → Promise<AgentResponse>`
- Load agent.yaml, markdown files, construct prompt
- Call Claude API, parse response to structured JSON
- Handle errors: timeout, parse failure, rate limit

**Test coverage:**
- Unit tests for prompt construction
- Mock tests for API response parsing
- Error handling tests (timeout, parse failure, invalid response)

#### 3.1.2: Add Dependencies
- `@anthropic-ai/sdk` for Claude API client
- Update `package.json` and install

#### 3.1.3: Define AgentResponse Schema
```typescript
interface AgentResponse {
  summary: string;
  findings: Finding[];
  nextSteps: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

interface Finding {
  type: 'issue' | 'suggestion' | 'risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location?: string;
  suggestion?: string;
}
```

**Timeline:** Week 1 (Mon-Fri)

---

## Phase 3.2: GitHub Actions Integration (1-2 weeks)

### Objective

Wire agent invocation into GitHub Actions workflows.

### Tasks

#### 3.2.1: Create Reusable Action
- Directory: `.github/actions/invoke-agent/`
- File: `action.yml` with inputs/outputs
- File: `index.js` that calls `packages/agentquilt/src/integration/claude-agent.ts`
- Accept inputs: agent-path, gate-name, task-input
- Return outputs: findings (JSON), summary, risk-level

**Tests:**
- Action can be called from workflows
- Outputs are parseable JSON
- Errors gracefully handle API failures

#### 3.2.2: Update Intake Workflow
- Replace mock agent invocation with real call to invoke-agent action
- Parse triage-agent response and post as issue comment
- Auto-label issue based on risk level (if available)
- Tag maintainers if high/critical risk

**Test:** Create test issue, verify triage findings posted

#### 3.2.3: Update PR Review Workflow
- Invoke code-review agent on all PRs
- Invoke eval-agent if .agents/ changed
- Invoke security-agent if high-risk files changed
- Post findings as separate PR comments (one per agent)
- Request changes if critical security issue found

**Test:** Create test PR with intentional issues, verify all agents invoked

#### 3.2.4: Update Release Workflow
- Invoke release-manager on manual dispatch
- Generate changelog draft and post as workflow output
- Verify all checks pass before offering approve button
- Require human approval before publish step

**Test:** Create test release, verify manager artifacts generated

**Timeline:** Week 2 (Mon-Fri)

---

## Phase 3.3: Environment Setup (1 week)

### Objective

Set up credentials and monitoring for production use.

### Tasks

#### 3.3.1: GitHub Actions Secrets
- Add `ANTHROPIC_API_KEY` to GitHub repository secrets
- Document how to generate key at console.anthropic.com
- Add to CONTRIBUTING.md setup instructions

#### 3.3.2: API Cost Monitoring
- Set up spending limit on Anthropic API key
- Plan for expected monthly costs (model × invocations)
- Document in BUDGET.md

#### 3.3.3: Logging & Observability
- Add structured logging to claude-agent.ts
- Capture: invocation time, model, tokens used, response latency
- Log to GitHub Actions artifacts for post-run review

#### 3.3.4: Rate Limiting
- Implement token bucket rate limiter
- Avoid hitting Anthropic API rate limits
- Queue agent invocations if backpressure detected

**Timeline:** Week 1-2 (parallel with 3.2)

---

## Phase 3.4: Testing & Validation (1-2 weeks)

### Objective

Validate that agent findings are useful and accurate.

### Tasks

#### 3.4.1: Pilot Testing (Intake Gate)
- Enable triage-agent for all new issues
- Collect 10-20 issues and review agent findings
- Measure: accuracy, usefulness, false positive rate
- Iterate on agent prompt based on findings

#### 3.4.2: Code Review Agent Testing
- Enable code-review agent on internal PRs
- Collect findings on 5-10 PRs
- Compare to human review findings
- Adjust prompt to improve signal-to-noise ratio

#### 3.4.3: Comprehensive Testing
- Enable all agents (intake, PR review, release)
- Create test scenarios for each workflow
- Document common agent outputs (e.g., what constitutes a "good" finding)
- Establish baselines for accuracy

#### 3.4.4: Feedback Loop
- Collect feedback from maintainers on agent findings
- Identify false positives and improve prompts
- Document what works well and what doesn't
- Refine agent responsibilities in gate policies

**Timeline:** Week 3-4

---

## Phase 3.5: Documentation & Launch (1 week)

### Objective

Prepare team for agent-assisted workflows.

### Tasks

#### 3.5.1: User Documentation
- Update CONTRIBUTING.md with agent workflow info
- Explain how to interpret agent findings
- When to override agent recommendations
- How to report agent failures

#### 3.5.2: Operator Documentation
- How to debug failed agent invocations
- How to monitor API costs and usage
- How to update agent prompts (edit agent.yaml + .md files)
- Rollback procedure if agents misbehave

#### 3.5.3: Troubleshooting Guide
- Common agent failures and fixes
- API timeout recovery
- Rate limiting handling
- When to contact Anthropic support

#### 3.5.4: Announce Launch
- Post announcement on team channels
- Schedule walkthrough of agent workflows
- Invite feedback for continuous improvement

**Timeline:** Week 1 (parallel with validation)

---

## High-Level Timeline

```
        Phase 3.1       Phase 3.2       Phase 3.3   Phase 3.4    Phase 3.5
        (API Layer)     (Workflows)     (Setup)     (Testing)    (Launch)
        
Week 1  ████████        
Week 2                  ████████        ████░░░░
Week 3                                          ████████
Week 4                                                    ████░░░░
Week 5                                                            ████
```

**Total:** 4-5 weeks

---

## Success Criteria

### Phase 3.1 ✅
- [ ] Claude API client implemented and tested
- [ ] AgentResponse schema validated
- [ ] All error cases handled gracefully

### Phase 3.2 ✅
- [ ] invoke-agent action callable from workflows
- [ ] All three workflows updated to use real agent invocation
- [ ] Agent findings posted to GitHub as comments
- [ ] No blocking failures (agents don't break CI)

### Phase 3.3 ✅
- [ ] ANTHROPIC_API_KEY configured in GitHub Actions
- [ ] API cost monitoring in place
- [ ] Rate limiting working as expected
- [ ] Logging available for debugging

### Phase 3.4 ✅
- [ ] Triage-agent tested on 10+ issues
- [ ] Code-review agent tested on 5+ PRs
- [ ] Accuracy > 80% (maintainer judgment)
- [ ] False positive rate < 20%

### Phase 3.5 ✅
- [ ] All documentation updated
- [ ] Team trained on new workflows
- [ ] Feedback collection process established
- [ ] Ready for continuous improvement

---

## Known Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Claude API outage | Workflows stall | Graceful degradation: post "agent unavailable" status, don't block gate |
| Agent findings wrong | False positives waste time | Pilot testing, iterate on prompts |
| API costs high | Budget overrun | Rate limiting, cost monitoring, spending limits |
| Slow response time | Poor UX | Cache agent responses, async processing |
| Token limit exceeded | Truncated output | Summarize input, use smaller model if needed |

---

## Success Story (Post-Phase 3)

After Phase 3 completes, AgentQuilt will be:

1. **Intelligent:** AI agents assist at every gate (intake, requirements, architecture, PR, release)
2. **Scalable:** Teams can review more issues faster with AI triage
3. **Auditable:** All agent findings tied to gate policies and ADR-0004 authority model
4. **Human-Centered:** Agents suggest; humans decide (never override human judgment)
5. **Self-Improving:** Feedback loop to refine agent prompts over time

### Example Workflow

**Before Phase 3:**
> Issue created → Manual triage → Manual code review → Manual release prep → Manual publish

**After Phase 3:**
> Issue created → AI triage (finding flags security risk) → AI code review + human decision → AI release prep (findings reviewed) → Human publishes

Agent work is fast and scalable; human judgment remains on all decisions.
