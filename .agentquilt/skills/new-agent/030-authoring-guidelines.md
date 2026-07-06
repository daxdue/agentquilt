## Authoring guidelines for fragments

- One concern per fragment: role, review criteria, output format, safety rules each get their own file. Fragments are the unit of review and versioning; small fragments mean conflict-free parallel edits.
- Number with gaps of 10 (`010`, `020`, `030`) so fragments can be inserted later without renumbering. Fragments compile in numeric order.
- Address the agent directly in imperative voice ("You are...", "Always...", "Never..."). The compiled body is the agent's system prompt.
- The first fragment (`010-role.md`) states who the agent is and its goal. Later fragments add criteria, constraints, and output expectations.
- Reuse `_shared/` fragments for rules that apply across agents (tone, safety) instead of duplicating text.
- Fragment bodies are emitted verbatim: whatever you write is exactly what the agent receives. Do not rely on the compiler to clean anything up.
- Respect the host repository's authoring policies. In the AgentQuilt repository itself, fragments must be plain text with no emojis or pictographic symbols (see `.docs/EMOJI_POLICY.md`); use markers like `[OK]` and `WARNING` instead.
