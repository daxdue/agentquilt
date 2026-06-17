# AgentQuilt

AgentQuilt is a Git-native framework for maintaining AI agent instructions as structured, composable, validated source files instead of manually edited Markdown prompts.

## Problem

Large agent Markdown files are hard to maintain in distributed teams. Multiple developers editing the same `.md` file often create merge conflicts, and those conflicts are difficult to resolve because agent instructions are semantic, not purely syntactic.

## Solution

AgentQuilt introduces a structured source model:

Agent = Manifest + Instruction Blocks + Evals + Generated Prompt

Developers edit small structured instruction blocks. AgentQuilt validates and compiles them into deterministic Markdown artifacts.

## Goals

- Reduce merge conflicts in agent files
- Make agent changes reviewable
- Validate agent definitions
- Generate deterministic Markdown prompts
- Support CI gates
- Support eval-based regression testing
- Provide traceability for agent behavior changes

## Non-Goals

- Replacing human review
- Fully automatic semantic conflict resolution
- Building a web platform in the MVP
- Requiring live LLM calls for core compilation

## Project Status

Early foundation phase.

## Repository Structure

Explain main folders.

## Roadmap

Link to `docs/roadmap.md`.

## Contributing

Link to `CONTRIBUTING.md`.

## Architecture

Link to `docs/architecture/overview.md`.

Pre-release. No functional code yet — check back at
[agentquilt.dev](https://agentquilt.dev) for updates.

## License

MIT