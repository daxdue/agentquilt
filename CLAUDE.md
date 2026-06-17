# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AgentQuilt** is a framework for maintaining AI agent instruction files in distributed engineering teams. Rather than editing large, free-form Markdown prompt files directly, AgentQuilt represents each agent as a structured, composable, validated set of source files that compile deterministically into a final deployable `.md` prompt artifact.

Current status: **Pre-release, placeholder version.** This release reserves the npm package name; functional implementation is in active development. Follow progress at [agentquilt.dev](https://agentquilt.dev).

The eventual CLI will be `agentctl`.

## Architecture & Design

The framework will operate on the principle of:
- **Structured source files**: Each agent is represented as multiple source files rather than a single monolithic prompt file
- **Composability**: Instructions, manifests, and evaluation tests can be combined and reused
- **Deterministic compilation**: Source files compile to a single, reproducible `.md` prompt output
- **Validation**: Structured input enables validation before compilation

When implementation begins, the core components to expect are:
- A manifest format for defining agent metadata and structure
- An instruction block system for modular prompt sections
- Evaluation tests for validating agent behavior
- A compiler that orchestrates the build pipeline

## Development Commands

```bash
# Install dependencies
npm install

# Test (currently a placeholder)
npm test
```

The project has no build step currently; it's published directly to npm as a placeholder.

## npm Package Details

- **Package name**: `agentquilt`
- **Main entry**: `index.js`
- **Node requirement**: >= 18
- **Published to**: npm (github.com/daxdue/agentquilt)
- **License**: MIT

## Key Files

- `README.md` — Public-facing project description
- `package.json` — npm package metadata
- `index.js` — Placeholder CLI entry point
- `LICENSE` — MIT license

## Future Development Notes

When implementing the CLI and core compilation system:
- Focus on making the source file format intuitive and versionable
- Ensure the compilation is deterministic (critical for prompt consistency)
- Build validation into the compilation step to catch errors early
- Consider how teams will collaborate on shared instruction blocks and manifests
