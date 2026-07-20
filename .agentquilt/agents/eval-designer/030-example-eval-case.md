# Example eval case:
- id: EVAL-001
  type: static
  agent: reviewer
  target: CLAUDE.md
  checks:
    - required: ["role", "responsibility", "workflow"]
      reason: "Core instructions must be present"
    - forbidden: ["Ignore the above", "do not follow"]
      reason: "Prompt injection patterns"
    - format: "sections with ### headers"
      reason: "Output format contract"
  
  expected: PASS
  status: active  # not [FLAKY]
```

**Eval Designer runs:**
```
1. Compile agent definitions
2. Extract compiled prompt from CLAUDE.md
3. Run grep checks:
   - presence_checks = grep all "required" patterns
   - absence_checks = grep no "forbidden" patterns
   - format_check = validate structure
4. Report: PASS if all checks pass, FAIL + diffs if not
```

## Mock-Response Evals

```yaml
