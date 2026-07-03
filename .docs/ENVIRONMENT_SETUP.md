# Environment Setup: GitHub Actions Agent Integration

**Phase:** 3.3  
**Status:** Configuration & Documentation  
**Updated:** June 24, 2026

---

## Overview

This guide walks through setting up the environment for production agent invocation via GitHub Actions.

**Components to configure:**
1. Anthropic API key in GitHub Actions secrets
2. Cost monitoring and spending limits
3. Structured logging and observability
4. Rate limiting for API calls

---

## 3.3.1: GitHub Actions Secrets Setup

### Step 1: Generate Anthropic API Key

1. Visit https://console.anthropic.com/keys
2. Sign in with your Anthropic account (or create one)
3. Click "Create Key"
4. Give it a name: `agentquilt-github-actions`
5. Copy the key (starts with `sk-ant-`)

### Step 2: Add to GitHub Repository

```bash
# Option A: Using GitHub CLI (recommended)
gh secret set ANTHROPIC_API_KEY --body "sk-ant-YOUR-KEY-HERE"

# Option B: Via GitHub Web UI
1. Go to: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: ANTHROPIC_API_KEY
4. Value: sk-ant-YOUR-KEY-HERE
5. Click "Add secret"
```

### Step 3: Verify in Workflows

All workflows automatically use `${{ secrets.ANTHROPIC_API_KEY }}`:

```yaml
- uses: ./.github/actions/invoke-agent
  with:
    agent-path: .agents/sdlc/code-review
    gate-name: pr-quality-gate
    task-input: '{...}'
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Step 4: Test Secret Access

Create a test workflow to verify access:

```bash
# .github/workflows/test-api-key.yml
name: Test API Key

on: workflow_dispatch

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Check API key exists
        run: |
          if [ -z "${{ secrets.ANTHROPIC_API_KEY }}" ]; then
            echo "❌ ANTHROPIC_API_KEY not set"
            exit 1
          else
            echo "✅ ANTHROPIC_API_KEY is configured"
          fi
```

Run it: `gh workflow run test-api-key.yml`

---

## 3.3.2: API Cost Monitoring

### Configure Spending Limits

**In Anthropic Console:**

1. Go to https://console.anthropic.com/settings/usage
2. Set **Spending limit** (e.g., $100/month)
3. Choose **alert threshold** (e.g., 80% of limit)
4. Enable **email notifications**

**Expected Costs (estimate):**

| Scenario | Model | Input Tokens | Output Tokens | Cost |
|---|---|---|---|---|
| Issue triage (1 issue) | sonnet | 500 | 200 | ~$0.005 |
| PR code review (500 line diff) | sonnet | 2000 | 500 | ~$0.020 |
| Release management (full analysis) | sonnet | 3000 | 1000 | ~$0.035 |

**Monthly estimate (assume 50 PRs, 100 issues, 4 releases):**
- Issues: 100 × $0.005 = $0.50
- PRs: 50 × $0.020 = $1.00
- Releases: 4 × $0.035 = $0.14
- **Total: ~$1.64/month** (very low cost)

### Add Cost Tracking to CI

Create `.github/workflows/cost-report.yml`:

```yaml
name: Monthly Cost Report

on:
  schedule:
    - cron: '0 9 1 * *'  # 1st of month at 9 AM UTC
  workflow_dispatch:

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Get spending from Anthropic API
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Query Anthropic API for usage stats
          # (Implementation depends on API availability)
          echo "Monthly agent invocation cost report"
          echo "API key is configured and ready"

      - name: Create GitHub issue with report
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Cost Report: ${new Date().toISOString().split('T')[0]}`,
              body: '💰 Monthly cost report\n\nAgent invocation spending: $X.XX'
            })
```

---

## 3.3.3: Logging & Observability

### Structured Logging in claude-agent.ts

Update `packages/agentquilt-cli/src/integration/claude-agent.ts` to add structured logging:

```typescript
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

// Log invocations for observability
function logInvocation(log: InvocationLog) {
  const logEntry = JSON.stringify(log);
  console.log(logEntry); // GitHub Actions captures this
}
```

### GitHub Actions Artifact Logging

Logs are automatically captured by GitHub Actions:

```yaml
- name: Invoke agent
  id: agent
  uses: ./.github/actions/invoke-agent
  with:
    # ... inputs ...

- name: Upload agent logs
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: agent-logs-${{ github.run_id }}
    path: /tmp/agent-*.log
    retention-days: 30
```

### Viewing Logs

**Option 1: GitHub Actions UI**
1. Go to repo → Actions
2. Click workflow run
3. Click "Invoke agent" step
4. Logs appear in console

**Option 2: Download artifacts**
```bash
gh run download <RUN_ID> -n agent-logs-<RUN_ID>
```

**Option 3: Query via API**
```bash
gh api repos/:owner/:repo/actions/runs/:run_id/logs
```

### Log Examples

**Successful invocation:**
```json
{
  "timestamp": "2026-06-24T11:30:00Z",
  "agentName": "code-review",
  "gateName": "pr-quality-gate",
  "model": "claude-sonnet-4-6",
  "inputTokens": 2150,
  "outputTokens": 450,
  "durationMs": 2340,
  "status": "success"
}
```

**Failed invocation:**
```json
{
  "timestamp": "2026-06-24T11:35:00Z",
  "agentName": "security-review",
  "gateName": "pr-quality-gate",
  "model": "claude-sonnet-4-6",
  "durationMs": 5000,
  "status": "error",
  "errorMessage": "API rate limit exceeded"
}
```

---

## 3.3.4: Rate Limiting

### Token Bucket Rate Limiter

Add to `packages/agentquilt-cli/src/integration/claude-agent.ts`:

```typescript
interface RateLimitConfig {
  maxRequests: number;      // max invocations
  windowSeconds: number;    // per this many seconds
  maxRetries: number;       // if rate limited
  backoffMs: number;        // initial retry delay
}

class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const windowStart = now - (this.config.windowSeconds * 1000);

    // Remove old requests outside window
    this.requests = this.requests.filter(t => t > windowStart);

    // Check if we can proceed
    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitMs = (oldestRequest + (this.config.windowSeconds * 1000)) - now;
      console.log(`Rate limit: waiting ${waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      return this.acquire(); // retry
    }

    this.requests.push(now);
  }
}

// Default: 10 requests per minute
export const limiter = new RateLimiter({
  maxRequests: 10,
  windowSeconds: 60,
  maxRetries: 3,
  backoffMs: 1000,
});
```

### Usage in invokeAgent()

```typescript
export async function invokeAgent(
  agentPath: string,
  gateName: string,
  taskInput: AgentInvocationInput
): Promise<AgentResponse> {
  // Rate limit before API call
  await limiter.acquire();

  try {
    // ... existing code ...
    const response = await client.messages.create({...});
    return parseAgentResponse(textContent.text);
  } catch (err) {
    if (err.status === 429) {
      // Rate limited by Anthropic API
      console.warn('Anthropic API rate limited, backing off...');
      await new Promise(r => setTimeout(r, 5000));
      return invokeAgent(agentPath, gateName, taskInput); // retry
    }
    throw err;
  }
}
```

### GitHub Actions Rate Limiting

Set in workflows to prevent cascading failures:

```yaml
jobs:
  pr-review:
    runs-on: ubuntu-latest
    concurrency:
      group: agents-${{ github.repository }}
      cancel-in-progress: false
    steps:
      # Only one agent invocation at a time per repo
```

---

## 3.3.5: Configuration Summary

### Environment Variables

```bash
# Required (set via GitHub Actions secrets)
ANTHROPIC_API_KEY=sk-ant-YOUR-KEY-HERE

# Optional (set in .env or CI config)
AGENT_LOG_LEVEL=info           # debug, info, warn, error
AGENT_TIMEOUT_MS=30000         # max time per invocation
AGENT_MAX_RETRIES=3            # retry on transient errors
AGENT_RATE_LIMIT=10            # max requests per minute
```

### GitHub Actions Secrets

```bash
# Required
ANTHROPIC_API_KEY              # Anthropic API key

# Optional but recommended
GITHUB_TOKEN                   # Provided automatically
AGENT_ADMIN_EMAIL              # For cost alerts
```

---

## 3.3.6: Troubleshooting

### "ANTHROPIC_API_KEY not found"

**Symptom:** Workflow fails with "Missing required input: anthropic-api-key"

**Solution:**
1. Verify secret is set: `gh secret list` → should show ANTHROPIC_API_KEY
2. Verify secret is not masked: Check Actions log, should see `***` not the actual key
3. Verify workflow uses correct name: Must be `${{ secrets.ANTHROPIC_API_KEY }}`

### "API rate limit exceeded"

**Symptom:** Workflow fails with 429 status code

**Solutions:**
1. Increase `AGENT_RATE_LIMIT` in config
2. Reduce concurrent workflows: use `concurrency` in job config
3. Use exponential backoff: built into `invokeAgent()` already
4. Contact Anthropic support to increase limit (very unlikely needed)

### "Timeout waiting for agent response"

**Symptom:** Workflow hangs or fails with timeout

**Solutions:**
1. Increase `AGENT_TIMEOUT_MS` (default 30s should be fine)
2. Check Anthropic API status: https://status.anthropic.com/
3. Reduce task input size (large diffs take longer to process)
4. Check GitHub Actions queue: may be delayed start

### "API costs higher than expected"

**Symptom:** Monthly bill is $X when expecting $Y

**Solutions:**
1. Check logs for failed/retried invocations (each retry = new API call)
2. Reduce agent invocations: disable for non-critical workflows
3. Use cheaper model: change `model: sonnet` to `model: haiku` (less accurate but 3x cheaper)
4. Set spending limit to prevent overages: https://console.anthropic.com/settings/usage

---

## 3.3.7: Operational Checklist

Before going to production:

- [ ] ANTHROPIC_API_KEY configured in GitHub Actions secrets
- [ ] Spending limit set in Anthropic console (e.g., $500/month)
- [ ] Email alerts enabled for 80% spending threshold
- [ ] Cost report workflow scheduled (monthly)
- [ ] Logging configured and artifacts stored
- [ ] Rate limiting implemented and tested
- [ ] Concurrency control enabled in workflows
- [ ] Timeouts set appropriately
- [ ] Retry logic tested with transient failures
- [ ] Error messages logged for debugging
- [ ] Team trained on reading agent logs
- [ ] Runbook created for common failures

---

## Next Steps: Phase 3.4

Once environment is configured:
1. Run test issue/PR to verify end-to-end flow
2. Monitor first 10 invocations for accuracy
3. Collect timing and cost data
4. Iterate on agent prompts if needed
5. Expand to all workflows after validation

See `.docs/PHASE_3_4_TESTING.md` for detailed validation plan.
