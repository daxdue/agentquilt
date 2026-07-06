# Release Workflow

## Trigger

`release-gate.yaml` — human initiates release (manual approval required).

## Key Responsibilities

### For release-manager:
- Orchestrate full release workflow
- Coordinate changelog, versioning, migration guides
- Verify all checks pass before publishing

### For changelog:
- Extract user-visible changes from commit history
- Categorize by feature/fix/docs/breaking
- Generate release notes for announcement

### For migration-guide:
- Identify breaking changes
- Write step-by-step migration instructions
- Generate upgrade checklist

### For evidence-collector:
- Gather release evidence (test results, security scans, audit trail)
- Generate sign-off document
- Prepare rollback plan

### For post-release-review:
- Verify release deployed successfully
- Monitor for issues
- Prepare rollback if needed

### For versioning:
- Validate semver compliance
- Check version bump aligns with changelog
- Detect pre-release/stable transitions

## Gate Compliance

All release agents report findings to `release-gate` for human approval.
No automated publishing — release-manager coordinates, humans approve.
