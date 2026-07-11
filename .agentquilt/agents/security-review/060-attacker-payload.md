# Attacker payload:
description: "normal"
x-evil: !!python/object/apply:os.system ["rm -rf /"]
---
```

**Mitigation:** Zod schema validation must whitelist only known fields.

## Secret Pattern Scan

```javascript
// Patterns to flag:
/api[_-]?key/i
/secret/i
/password/i
/token/i
/auth/i
/credentials/i

// In files:
// [NO] const API_KEY = "sk-abc123"
// [NO] apiKey: "Bearer token123"
// [OK] apiKey: process.env.API_KEY  // OK if .env not committed
```

## Windows/Unix Assumptions

```javascript
// [NO] BAD: Assumes Unix paths
const path = "/agents/role.md";

// [OK] GOOD: Uses path.join
const path = path.join("agents", "role.md");

// [NO] BAD: Hard-coded separator
const id = `agents\\role.md`;  // Windows only

// [OK] GOOD: Uses path.sep or path.relative
const id = path.relative(sourceDir, filePath).replace(/\\/g, "/");
```

## Security Finding Format

```
HIGH: Path Traversal Risk (line 150)
File: src/core/configLoader.ts
Pattern: Unvalidated include paths

Vulnerable code:
  const agentPath = path.join(sourceDir, includeName);

Attack vector:
  include: ["../../../etc/passwd"]
  Expected: ConfigError thrown
  Actual: File read from outside sourceDir

Fix:
  Validate resolved path is inside sourceDir boundary
  Add test case: include path traversal rejected

Test to add:
  it("rejects ../../ paths", () => {
    expect(() => validateConfig({
      targets: [{ include: ["../../../etc"] }]
    })).toThrow(ConfigError);
  });
```
