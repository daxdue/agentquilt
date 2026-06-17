# ADR-0002: Use YAML as the Initial Agent Source Format

## Status

Accepted

## Context

AgentQuilt needs a human-readable structured format for agent manifests, instruction blocks, evals, and gate policies.

Options considered:

- Markdown
- JSON
- YAML
- TOML

## Decision

Use YAML as the initial source format.

## Rationale

YAML is readable, supports multiline text well, and is familiar for configuration files, CI pipelines, and infrastructure-as-code workflows.

## Consequences

Positive:

- Good readability
- Good support for multiline instruction text
- Easy adoption by engineering teams
- Suitable for manifests, policies, and evals

Negative:

- YAML has parsing edge cases
- Requires strict schema validation
- Formatting consistency must be enforced