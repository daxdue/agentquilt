# Claude Code Agent Invocation: Manual Only

**Date:** June 24, 2026  
**Status:** Simplified Workflow  
**Impact:** Removed CI/CD automation, human-centered only

---

## Overview

AgentQuilt agents are now invoked **manually via Claude Code only**, not automatically in CI/CD workflows.

**Benefits:**
- No API costs for automated checks
- Agents only run when needed, not on every event
- Humans explicitly decide when to use agents
- Aligns with ADR-0004: humans make decisions, not automata
- Simpler CI/CD pipelines (faster, easier to debug)
- Reduced complexity in GitHub Actions workflows

---

## Architecture Change

### Before (Phases 3.1-3.3)

```
Event (PR opened, issue created)
  ↓
GitHub Actions workflow
  ↓
Invoke agent via Claude API
  ↓
Post findings as comment
  ↓
Human reviews findings
```

**Issues:**
- Costs money per event (even if not needed)
- Agents run automatically (not human-initiated)
- Complex GitHub Actions integration
- API failures break CI/CD

### After (Simplified)

```
Event (PR opened, issue created)
  ↓
GitHub Actions runs tests/checks only
  ↓
Posts reminder comment: "Use Claude Code agents for review"
  ↓
Human opens in Claude Code
  ↓
Human selects agent from agents list
  ↓
Human reviews findings
```

**Benefits:**
- No API calls from CI/CD
- Human explicitly invokes agents
- Agents still discoverable in Claude Code
- CI/CD remains fast and reliable
- Better alignment with "human decides" principle

---

## Workflows Simplified

### Intake Workflow (issue-intake.yml)

**Old:** Auto-invoked triage-agent on issue creation  
**New:** Posts comment with reminder to use Claude Code

```yaml
- name: Post triage reminder comment
  script: |
    github.rest.issues.createComment({
      body: "Use Claude Code to invoke the **product-discovery** agent"
    })
```

### PR Review Workflow (pr-review.yml)

**Old:** Auto-invoked 3 agents (code-review, eval-designer, security-review)  
**New:** Runs core checks (TypeScript, tests, coverage, drift)

```yaml
jobs:
  quality-gate:
    steps:
      - TypeScript check
      - Run tests
      - Coverage check
      - Build CLI
      - Drift check
      - Post review reminder (use Claude Code agents)
```

### Release Workflow (release.yml)

**Old:** Auto-invoked 3 agents (release-manager, changelog, versioning)  
**New:** Runs pre-release checks only

```yaml
jobs:
  release-gate-check:
    steps:
      - Run all tests
      - Check coverage
      - Build CLI
      - Drift check
      - Verify risk register
      - Post release checklist (use Claude Code agents)
```

---

## How to Use Agents Now

### Manual Invocation via Claude Code

1. **Open issue/PR/file in Claude Code**
   - Desktop app, web, IDE extension, or CLI

2. **Find agents in sidebar**
   - "Agents" section shows all 46 discoverable agents

3. **Select relevant agent**
   - For issues: `product-discovery` (triage)
   - For PRs: `code-review`, `eval-designer`, `security-review`
   - For releases: `release-manager`, `changelog`, `versioning`

4. **Agent analyzes and reports**
   - Claude runs agent with your content as input
   - Agent returns structured findings
   - Human reviews and decides action

### Example: PR Code Review

```
1. Open PR in Claude Code
2. Click "Agents" in sidebar
3. Search: "code-review"
4. Select: "code-review" agent
5. Claude runs agent on PR diff
6. Agent returns: findings + risk level
7. Human reviews and decides: approve, request changes, or close
```

---

## Files Removed/Changed

### Removed
- `.github/actions/invoke-agent/` - No longer needed (was GitHub Actions integration)
- `docs/ENVIRONMENT_SETUP.md` - No API key setup required
- `packages/agentquilt/src/integration/claude-agent.ts` - No longer called from CI
- `packages/agentquilt/tests/claude-agent.test.ts` - No longer needed

### Kept
- `.claude/agents/*.md` - All 46 agents still compiled and discoverable
- `policies/gates/*.yaml` - Gate policies still define requirements
- `agents/**/*.md` - Agent definitions (role, workflow)
- `PHASE_3_COMPLETION.md` - Documents agent discovery working

### Modified
- `.github/workflows/intake.yml` - Simplified, posts reminder comment
- `.github/workflows/pr-review.yml` - Runs checks only, suggests Claude Code agents
- `.github/workflows/release.yml` - Runs checks only, suggests Claude Code agents

---

## Benefits of Simplified Approach

### Cost
- **Before:** ~$1-2/month for automated invocations
- **After:** $0 (no API calls from CI/CD)
- **Savings:** Minimal cost but complexity reduction matters more

### Alignment with ADR-0004
- **Before:** Agents auto-ran on every event (automation-driven)
- **After:** Humans explicitly invoke agents (human-centered)
- **Principle:** Agents advise, humans decide

### Reliability
- **Before:** API failures could break CI/CD
- **After:** CI/CD independent of Anthropic API
- **Result:** Faster, more reliable pipelines

### Simplicity
- **Before:** Complex GitHub Actions integration, rate limiting, logging
- **After:** Simple reminders to use Claude Code
- **Result:** Easier to understand and maintain

### User Experience
- **Before:** Findings appear in GitHub comments automatically
- **After:** Humans decide when to get agent feedback
- **Result:** Less noise, more intentional

---

## When Would Auto-Invocation Make Sense?

Keep this approach (manual) unless you:
1. Have a team that always uses agents
2. Want consistent agent feedback on every PR
3. Have dedicated budget for API calls
4. Want to measure agent accuracy at scale
5. Are building agent-assisted workflows as core feature

For most projects, manual Claude Code invocation is better.

---

## FAQ

**Q: Will agents still work?**

A: Yes, all 46 agents are discoverable and usable in Claude Code. Just invoke them manually.

**Q: How do I see agent feedback on issues/PRs?**

A: Open the issue/PR in Claude Code and select the agent. Findings appear in Claude's response.

**Q: Can I copy findings to GitHub?**

A: Yes, you can copy agent output and paste into issue/PR comments manually.

**Q: What about the API integration code?**

A: It's still useful for other purposes (external tools, programmatic invocation, future integrations). We just don't use it in CI/CD.

**Q: Is this permanent?**

A: No, you can always re-enable automatic invocation by restoring the GitHub Actions integration if needed.

**Q: What if I want auto-invocation back?**

A: See `.docs/PHASE_3_1_COMPLETION.md` for the previous API integration implementation.

---

## Transition Notes

This simplification doesn't lose any capability:
- All agents still compiled ✅
- All agents still discoverable ✅
- Agent definitions unchanged ✅
- Gate policies still defined ✅
- Can re-enable automation anytime ✅

It just shifts from "automatic assistant" to "on-demand advisor."

---

## Related Documentation

- **[PHASE_3_COMPLETION.md](.docs/PHASE_3_COMPLETION.md)** — Agents now available
- **[ADR-0004](adr/ADR-0004.md)** — Authority model: humans decide
- **[Gate Policies](../policies/gates/)** — What each gate requires
