# Governance Workflow

## Trigger Points

- PR changes `.agents/`, `policies/`, or `.docs/`
- New risk detected in code change
- Gate policy evaluation needed
- Compliance audit cycle

## Key Responsibilities

### Risk Assessment
- Classify risks by impact domain (security, architecture, compliance, process)
- Map risk to mitigation strategy
- Escalate critical/high risks

### Audit Trail
- Document all governance decisions
- Link to ADRs, gate policies, and risk register
- Maintain decision provenance for compliance

### Recommendations
- Suggest risk mitigations with owner assignments
- Flag policy violations
- Recommend preventive actions

## Integration Points

- **Intake Gate** — risk-agent flags initial risk level
- **PR Quality Gate** — compliance-agent verifies policies
- **Release Gate** — traceability-agent verifies no critical risks
