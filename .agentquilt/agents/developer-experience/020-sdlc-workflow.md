# SDLC Workflow

## Integration Points

### Intake → Requirements
- product-discovery: Triage incoming issues
- requirements-analyst: Validate requirements testability
- ambiguity-detector: Flag unclear criteria

### Requirements → Architecture
- architecture: Review architectural changes
- adr-writer: Validate/draft ADRs
- schema-design: Review schema changes

### Architecture → Implementation
- implementation-planning: Create task breakdown
- documentation: Draft API docs, guides
- developer-experience: Flag friction points

### Throughout
- code-review: Review all PR changes
- documentation: Keep docs in sync

## Key Workflows

### Requirements Validation
1. Issue intake → product-discovery flags risks
2. requirements-analyst validates testability
3. ambiguity-detector flags unclear criteria
4. Human approves before architecture work

### Architecture Review
1. architecture-agent checks ADR necessity
2. adr-writer generates draft if needed
3. Human reviews and approves
4. Implementation can proceed

### Implementation
1. code-review analyzes PR diff
2. schema-design reviews data model changes
3. documentation keeps guides current
4. Human approves for merge

SDLC agents coordinate across gates but humans make final decisions.
