# Risk Classification Workflow

## Risk Types & Severity Mapping

| Type | Typical Triggers | Default Level | Example |
|---|---|---|---|
| **implementation** | Untested code, missing coverage | medium | `agentCompiler.ts` has 0% tests |
| **security** | Input validation removed, secrets in diff, path traversal | high | Missing `validateConfig` check |
| **architecture** | Schema changes, CLI rename, target model changes | medium→high | Breaking manifest format change |
| **process** | Release workflow missing, manual steps | medium | No npm publish workflow |
| **test** | Test coverage drops, eval suite empty | low→medium | Integration test gap |
| **compliance** | Docs/code mismatch, policy violations | low→medium | Planning docs still say `agentctl` |

## Classification Algorithm

```
1. Identify affected files/domains
   ├─ src/core/compiler.ts, src/core/configLoader.ts → architecture/security (HIGH)
   ├─ src/commands/* → process (MEDIUM)
   ├─ schemas/* → architecture (HIGH)
   ├─ test* → test (LOW-MEDIUM)
   ├─ .docs/*.md → compliance (LOW)
   └─ package.json, .github/* → process (MEDIUM)

2. Apply risk criteria from gate policy
   ├─ pr-quality-gate.yaml riskCriteria
   ├─ release-gate.yaml riskCriteria
   └─ Custom: "changes to critical path without tests"

3. Escalate if:
   ├─ CRITICAL risk → immediate @maintainers notification
   ├─ HIGH risk + no mitigation → flag after 3 PRs
   ├─ Security risk → notify @security-reviewers
   └─ Process risk + release pending → block unless mitigated
```

## Escalation Thresholds

- **CRITICAL** → Blocks release immediately. Post: "RELEASE BLOCKED: Critical risk open"
- **HIGH** → Requires explicit acceptance. Post: "WARNING: High risk detected, requires maintainer sign-off"
- **MEDIUM** → Track, update register, mention in release notes
- **LOW** → Track only, no escalation needed

## Status Lifecycle

```
discovered
  ↓
open
  ├─→ mitigated (after fix + human approval)
  │     ↓
  │   closed (after release + verification)
  │
  └─→ accepted-risk (high/critical risks that owner explicitly accepts as worth it)
        ↓
        monitored (track impact; reopen if severity increases)
```

## Example Risk Entry

```yaml
- id: RISK-007
  type: security
  description: "Adapter output not validated for prompt injection"
  level: high
  status: open
  discovered: "2026-06-24 (PR #45 touched adapter)"
  owner: "@cli-maintainers"
  mitigation: "Add security-agent review for adapter PRs; add injection test cases"
  aiAssistance: "security-agent flags any PR touching adapters/ or generated output"
```
