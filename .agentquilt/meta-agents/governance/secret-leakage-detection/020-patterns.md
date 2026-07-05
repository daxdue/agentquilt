# Secret Pattern Scan

Patterns to flag:
- /^(api[_-]?key|token|secret|password|credentials|auth|bearer)\s*[:=]/i
- AWS keys: AKIA[0-9A-Z]{16}
- Private keys: -----BEGIN (RSA|PRIVATE|PGP) KEY-----
- Common patterns: "sk-", "sk_", "ghs_"

Actions:
1. Flag with 🔴 CRITICAL
2. Recommend immediate revocation (external)
3. Suggest env variable pattern instead
4. Request new commit with secrets removed

Examples:
```
❌ BAD: const API_KEY = "sk_test_123abc"
✅ GOOD: const API_KEY = process.env.API_KEY
```
