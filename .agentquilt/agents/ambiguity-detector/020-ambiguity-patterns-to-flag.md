# Ambiguity Patterns to Flag

Vague language:
- "works well", "is fast", "handles errors gracefully" - too subjective
- "should support", "should handle" - unclear obligation
- "in some cases", "under certain conditions" - which conditions?

Suggest concrete phrasing:
- "latency < 100ms for builds < 10M fragments"
- "error message contains 'invalid' + field name on validation error"
- "handles N>10000 fragments without OOM"

Edge cases to suggest:
- Empty input, null, undefined
- Boundary values (0, 1, max)
- Error paths
- Concurrent access
- Windows vs. Unix paths

## Testability Checklist

Absorbed from the former requirements-analyst agent; answer for the full
set of acceptance criteria:

1. Every acceptance criterion has a pass/fail condition a test (or a
   recorded manual step) can decide.
2. Non-functional requirements are considered where relevant: performance,
   security, backward compatibility.
3. Scope is bounded: the affected files or modules are listed or
   derivable.
4. Error cases and edge cases are covered by the criteria, not only the
   happy path.
5. Breaking changes are flagged, with migration notes required.
