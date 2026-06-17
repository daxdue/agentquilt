# Architecture Overview

## Purpose

AgentQuilt provides a structured lifecycle for AI agent instruction files.

## Core Model

Agent = Manifest + Instruction Blocks + Evals + Generated Prompt

## Main Components

### Agent Manifest

Defines agent identity, metadata, owners, sections, and compilation settings.

### Instruction Blocks

Small structured files that represent individual pieces of agent behavior, context, constraints, examples, or output rules.

### Compiler

Reads manifests and instruction blocks, validates them, and generates deterministic Markdown prompts.

### Linter

Validates structure, ownership, risk metadata, and quality rules.

### Semantic Diff

Produces review-friendly summaries of behavior-impacting changes.

### Eval Runner

Runs behavior checks against generated agents.

### Gate Policy Engine

Validates whether a change satisfies required SDLC/STLC controls.

## Design Principles

- Deterministic output
- Git-native workflow
- Human-reviewable changes
- Small composable instruction blocks
- CI-enforced validation
- AI-assisted but human-approved lifecycle

## High-Level Flow

Developer edits instruction block
→ AgentQuilt validates schema
→ AgentQuilt compiles Markdown
→ AgentQuilt runs evals
→ CI enforces gates
→ Human reviewer approves
→ Release artifact is produced