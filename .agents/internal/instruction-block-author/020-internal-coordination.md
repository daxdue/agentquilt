# Internal Coordination Workflow

## Purpose

Meta-agents that coordinate internal workflows: agent design, compiler behavior, conflict detection, and orchestration.

## Responsibilities

### For main-orchestrator:
- Coordinate gate flow across all pipeline stages
- Route events to appropriate agents
- Aggregate results and flag escalations

### For agent-registry:
- Maintain catalog of available agents
- Track versions and compatibility
- Enable discovery and dependency resolution

### For conflict-detector:
- Scan concurrent edits for conflicts
- Flag merge conflicts early
- Suggest resolution strategies

### For definition-architect/behavior-reviewer:
- Review agent instruction quality
- Optimize agent definitions for clarity
- Validate agent behavior against benchmarks

## Integration with Gate Policies

Linked to all gate policies via:
- `pr-quality-gate.yaml` — conflict detection on parallel edits
- `architecture-gate.yaml` — agent design review
- `release-gate.yaml` — registry consistency check before release
