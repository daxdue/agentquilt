# Secret Pattern Scan

Run over every diff this specialist reviews, including test fixtures and
example configs.

Patterns to flag:

```
/^(api[_-]?key|token|secret|password|credentials|auth|bearer)\s*[:=]/i
AWS keys: AKIA[0-9A-Z]{16}
Private keys: -----BEGIN (RSA|PRIVATE|PGP) KEY-----
Common prefixes: "sk-", "sk_", "ghs_", "ghp_"
```

Examples:

```
BAD:  const API_KEY = "sk_test_123abc"
BAD:  apiKey: "Bearer token123"
GOOD: const API_KEY = process.env.API_KEY   // if .env is not committed
```

Actions on a match:

1. Flag as BLOCKER (a committed secret must not merge).
2. Recommend immediate revocation of the exposed credential (external,
   human action).
3. Request a new commit with the secret removed and an environment
   variable used instead.
4. Propose the verification: the pattern scan over the corrected diff
   comes back clean, and the credential is confirmed revoked.
