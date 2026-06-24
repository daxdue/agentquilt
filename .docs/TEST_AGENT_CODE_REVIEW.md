# Agent Test: Code Review Agent

**Agent:** `.claude/agents/code-review.md`  
**Test Type:** Manual review of real PR diff  
**Difficulty:** Easy  
**Time to run:** ~5 min (manual prompt)  

---

## Test Scenario

### Input: Sample PR Diff

This PR compiles all 44 meta-agents to Claude platform format.

```diff
commit a7a0efb (HEAD)
Author: Claude Haiku <noreply@anthropic.com>
Date:   Mon Jun 24 09:52:00 2026 +0000

    feat: compile all 44 meta-agents to .claude/agents platform outputs

diff --git a/.agents/agentquilt.config.yaml b/.agents/agentquilt.config.yaml
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/.agents/agentquilt.config.yaml
@@ -0,0 +1,85 @@
+version: 1
+sourceDir: .
+defaultModelTier: balanced
+modelTiers:
+  frontier:
+    claude: claude-opus-4-8
+  balanced:
+    claude: claude-sonnet-4-6
+  fast:
+    claude: claude-haiku-4-5
+
+targets:
+  # Governance meta-agents
+  - kind: agent-definitions
+    agents:
+      - governance/risk-register
+      - governance/security-review
+      - governance/gatekeeper
+      ...
+    platforms:
+      - claude
```

### What Changed

1. Created `.agents/agentquilt.config.yaml` (85 lines)
   - New target definitions for 44 agents
   - sourceDir points to .agents/
   
2. Compiled 44 agent definitions to `.claude/agents/*.md` files
   - Each file contains normalized + composed agent instructions
   - Generated headers with version hashes
   
3. Files generated:
   - `.agents/.claude/agents/code-review.md` (3.8 KB)
   - `.agents/.claude/agents/eval-designer.md` (5.7 KB)
   - ... 42 more agents
   
4. Lock file created: `.agents/agentquilt.lock`

---

## Code Review Test: Expected Findings

### ✅ GOOD Things the Agent Should Find

**Correct aspects:**
1. **Architecture** — Using agentquilt.config.yaml is the right pattern per v1.1 spec
2. **Format** — YAML is valid, follows spec structure
3. **Completeness** — All 44 agents listed in targets
4. **Model tier** — Using `balanced` maps correctly to claude-sonnet-4-6
5. **Organization** — Agents grouped by category (governance, sdlc, stlc, release, internal)

### ⚠️ MEDIUM Issues the Agent Should Flag

1. **Documentation** — No comments explaining what this new config file does
   - *Suggestion:* Add header comment explaining this is for meta-agent compilation

2. **Naming clarity** — Platform passthrough in compiled agents uses `tools: Read, Grep, Glob`
   - *Question:* Are these the right tools for all 44 agents, or should each define its own?

3. **Testing** — PR adds 44 new files but no tests for the compilation
   - *Suggestion:* Add integration test verifying agents compile correctly

### 🟢 LOW Issues (Nice-to-have)

1. **Line length** — Config file is 85 lines; could be split by category for readability

---

## How to Invoke the Code Review Agent

### Step 1: Load the Agent Context

```markdown
# Load this from .claude/agents/code-review.md:

You are the AgentQuilt code-review agent. Review PRs for:
1. TYPE SAFETY — TypeScript strict mode violations, unsafe types
2. CORRECTNESS — Logic errors, edge cases, missing error handling
3. SECURITY — Path traversal, injection risks, resource limits, unsafe patterns
4. TEST COVERAGE — Missing tests for changed functions
5. SIMPLIFICATION — Reuse opportunities, cleaner patterns

Authority (ADR-0004):
- CAN: Review code, suggest changes, flag risks, recommend tests
- CANNOT: Approve PR, merge, override CI gates, block merge

[Full agent context from .claude/agents/code-review.md]
```

### Step 2: Provide Task Input

```
TASK: Review this PR for agentquilt

CHANGED FILES:
- .agents/agentquilt.config.yaml (NEW, 85 lines)
- .agents/.claude/agents/*.md (NEW, 44 files, 134 KB total)

DIFF (see full diff above)

CHECKLIST TO VERIFY:
- [ ] Type safety (YAML valid? Schema correct?)
- [ ] Correctness (Config semantically correct? Agents all listed?)
- [ ] Security (No hardcoded secrets? Paths safe?)
- [ ] Test coverage (New functionality tested? Integration test needed?)
- [ ] Simplification (Could this be more readable?)
```

### Step 3: Run the Agent

In Phase 3.1, this would be automated via:
```bash
node packages/agentquilt/src/integration/claude-agent.ts invoke \
  --agent-path .agents/sdlc/code-review \
  --gate-name pr-quality-gate \
  --task-input '{"event":"pull_request", "diff":"...", "files":[...]}'
```

For manual testing now:
```
1. Copy agent context from .claude/agents/code-review.md
2. Paste as system prompt in Claude
3. Provide task input above
4. Get review findings
```

---

## Expected Agent Output

```
🔍 CODE REVIEW AGENT REPORT

Type Safety: ✅ PASS
  - YAML schema valid (v1.1 spec compliant)
  - No type errors in config
  - agent-definitions targets correct

Correctness: ✅ PASS
  - All 44 agents listed and valid
  - sourceDir: . correctly resolves to .agents/
  - platforms: [claude] maps to claude adapter
  - Model tier balanced → claude-sonnet-4-6 ✓

Security: ✅ PASS
  - No hardcoded secrets in config
  - No path traversal risks
  - File paths are relative (portable)

Test Coverage: ⚠️ MEDIUM
  - New compilation feature added (44 agents)
  - No integration test added
  - Suggest: Add test that verifies agents compile and lock is valid
  - Test case: agentquilt build in .agents/ produces 44 .md files

Simplification: 🟡 LOW
  - Config is readable but long (85 lines)
  - Consider: Extract per-category target groups to separate config files
  - Or: Keep as-is (single source of truth is fine)

RISK LEVEL: LOW
  REASON: Additive change (new files, existing code untouched)
  BLOCKERS: None
  
RECOMMENDATIONS:
  1. Add header comment to .agents/agentquilt.config.yaml explaining purpose
  2. Add integration test: `agentquilt build` from .agents/ directory
  3. Verify each compiled agent has non-empty instruction fragments
  
AUTHORITY (ADR-0004):
  This review is advisory. Maintainer makes final decision on merge.
  Agent cannot approve, only suggest improvements.
```

---

## How to Actually Test This Now

### Option 1: Manual (No Phase 3.1 Implementation)

```bash
# 1. Copy agent text from .claude/agents/code-review.md
# 2. Open Claude (claude.ai or IDE)
# 3. Paste full agent context as system prompt
# 4. In user message, paste task input (changes + diff)
# 5. Get review findings
# 6. Verify findings match expected output above
```

### Option 2: Automated (With Phase 3.1 Implementation)

```typescript
// packages/agentquilt/src/integration/claude-agent.test.ts (future)
import { invokeAgent } from './claude-agent';

test('code-review agent can review actual PR changes', async () => {
  const findings = await invokeAgent(
    '.agents/sdlc/code-review',
    'pr-quality-gate',
    {
      event: 'pull_request',
      diff: require('fs').readFileSync('test-diff.patch', 'utf8'),
      files: ['.agents/agentquilt.config.yaml', '.agents/.claude/agents/*.md']
    }
  );
  
  expect(findings.findings.length).toBeGreaterThan(0);
  expect(findings.riskLevel).toBe('low');
  expect(findings.summary).toContain('config');
});
```

---

## Success Criteria

✅ **Agent successfully reviews PR diff**  
✅ **Findings include: type safety, correctness, security, test coverage**  
✅ **Flags medium issue: missing tests for compilation**  
✅ **Suggests: add integration test**  
✅ **Risk level: LOW (additive, non-breaking)**  
✅ **Authority: Advisory (no approval given)**  

---

## Next Steps

1. ✅ **Phase 0-3.0:** Agents scaffolded, compiled, documented ← YOU ARE HERE
2. ⏳ **Phase 3.1:** Implement Claude API integration (invokeAgent function)
3. ⏳ **Phase 3.2:** Wire into GitHub Actions workflows (actual automation)
4. ⏳ **Phase 3.3:** Test with real issues/PRs (feedback loop)
