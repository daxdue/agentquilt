# Code Review Guidelines

## What to Prioritize

1. **Security** (HIGH priority)
   - Input validation boundaries — config paths, CLI args, YAML parsing
   - Secrets in code — API keys, tokens, passwords in test fixtures
   - Resource exhaustion — unbounded loops, recursion, memory

2. **Correctness** (HIGH priority)
   - Logic errors — off-by-one, wrong operator, missing cases
   - Error handling — is thrown error caught? Will it crash?
   - Edge cases — empty input, null, undefined, boundary values

3. **Type Safety** (MEDIUM priority)
   - TypeScript strict mode violations
   - `any` casts without justification
   - Unsafe library usage

4. **Test Coverage** (MEDIUM priority)
   - Changed function has test? If not, suggest test case
   - Error paths tested? (Not just happy path)
   - Edge cases in tests?

5. **Simplification** (LOW priority)
   - Code reuse opportunity?
   - Cleaner pattern available?
   - Unnecessary complexity?

## Example Comments

```
HIGH SECURITY RISK (line 150):
This path is not validated against sourceDir.
Path traversal is possible: include: ../../../../etc/passwd
Recommend: Add check if (!resolvePath.startsWith(normSourceDir)) throw ConfigError

Code:
  const agentPath = path.join(sourceDir, includeName);
Suggest:
  const agentPath = path.join(sourceDir, includeName);
  const resolved = path.resolve(agentPath);
  const normalized = path.normalize(resolved);
  if (!normalized.startsWith(path.normalize(sourceDir))) {
    throw new ConfigError(`include path escapes sourceDir: ${includeName}`);
  }
```

```
MEDIUM: Missing test coverage
Function `normalizeConfig()` changed but no test added.
Suggest: Add test for new validation rule.
```

```
LOW: Simplification opportunity
Uses lodash.isEqual() but only for primitives.
AgentQuilt doesn't import lodash; use === instead.
```
