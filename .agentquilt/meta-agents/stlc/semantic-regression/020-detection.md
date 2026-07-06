# Semantic Regression Detection

Compare compiled prompt from PR vs. main branch:

1. Extract key instructions from both versions
2. Identify changes in meaning (not just wording)
3. Flag if safety/constraint changes detected
4. Compare instruction priority/ordering impact

Examples:
- "Always validate input" → "Trust input unless flagged" = REGRESSION
- "Require approval before X" → "Ask permission for X" = REGRESSION
- "Never execute Y" → "Execute Y if user asks" = REGRESSION

Output: Regression report + suggested baseline update (human approves).
