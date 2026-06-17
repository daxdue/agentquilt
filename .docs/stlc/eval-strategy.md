# AgentQuilt Eval Strategy

## Purpose

Evals protect expected behavior of generated agents.

## Eval Types

### Static Evals

Check generated prompts for required or forbidden instruction content.

### Mock Response Evals

Check stored sample responses against expected behavior.

### Live Model Evals

Optional future layer. Sends compiled agent prompt and test input to a model and grades the response.

## Eval Principles

- Evals should be tied to requirements or risks.
- Evals should test behavior, not only exact wording.
- High-risk behavior changes should include eval updates.
- Evals should not be silently changed to match regressions.
- Flaky evals should be tracked separately.

## Initial Eval Scope

The first evals should cover:

- Output format
- Required behavior rules
- Safety boundaries
- Tool usage constraints
- Semantic regression risks