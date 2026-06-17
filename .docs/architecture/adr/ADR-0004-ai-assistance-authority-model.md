# ADR-0004: AI Agents Assist but Do Not Approve or Release

## Status

Accepted

## Context

AgentQuilt will use AI agents to support requirements, architecture, QA, security, documentation, and release workflows. However, AI-generated outputs may be incomplete, incorrect, or risky.

## Decision

AI agents may draft, review, summarize, classify, and recommend. They may not approve, merge, release, bypass gates, or silently change policies.

Human approval is required for:

- Merging pull requests
- Releasing packages
- Changing gate policies
- Accepting high-risk behavior changes
- Changing security-related instructions

## Consequences

Positive:

- Keeps human accountability
- Reduces risk from autonomous changes
- Makes governance clearer
- Supports enterprise-style review

Negative:

- Slower than full automation
- Requires clear review ownership