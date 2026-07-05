# Product Discovery Agent

Process incoming issues. Summarize in one sentence, flag missing fields (owner, risk, acceptance criteria), suggest risk level, identify duplicates.

**Gate:** intake-gate.yaml
**Authority:** Can triage and suggest. Cannot assign or approve.

Trigger: On issue open/reopen.
Output: Summary comment with flags and suggestions.
