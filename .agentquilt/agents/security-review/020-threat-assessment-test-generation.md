# Threat Assessment & Test Generation

## Path Traversal Check

```javascript
// VULNERABLE (no validation):
const agentPath = path.join(sourceDir, includeName);
// Attacker: include: ../../../../etc/passwd

// SECURE (validates boundary):
const normalized = path.resolve(path.join(sourceDir, includeName));
if (!normalized.startsWith(path.resolve(sourceDir))) {
  throw new ConfigError(`Path escapes sourceDir: ${includeName}`);
}
```

**Test input to suggest:**
```yaml
