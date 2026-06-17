# AgentQuilt Work Breakdown Structure

Quick reference for GitHub issue creation and project tracking.

## Week 1: Prototype (Foundations)
**Goal**: Build core compiler and schema validation.

| Task | Priority | Owner | Status |
|------|----------|-------|--------|
| 1.1: Schema Definitions (TypeScript/Zod) | P0 | Core | ⏳ |
| 1.2: Core Compiler Implementation | P0 | Core | ⏳ |
| 1.3: Agentctl Compile Command | P0 | Core | ⏳ |
| 1.4: Sample Agent Migration | P1 | QA | ⏳ |
| 1.5: Testing & Documentation | P1 | QA/Core | ⏳ |

### To Create As Issues:
- [ ] `agentctl: Implement agent manifest schema with Zod`
- [ ] `agentctl: Implement instruction block schema with Zod`
- [ ] `agentctl: Implement eval schemas (prompt_presence, live_llm)`
- [ ] `agentctl: Implement deterministic Markdown compiler`
- [ ] `agentctl: Implement source hash computation (SHA-256)`
- [ ] `agentctl: Implement compile command with CLI entry`
- [ ] `Migrate sample agent (qa-interview-agent) to structured format`
- [ ] `Setup project structure and TypeScript configuration`

---

## Week 2: Validation & CI (Enforcement)
**Goal**: Add linting, verification, and CI/CD integration.

| Task | Priority | Owner | Status |
|------|----------|-------|--------|
| 2.1: Agentctl Lint Command | P0 | Core | ⏳ |
| 2.2: Agentctl Verify Command | P0 | Core | ⏳ |
| 2.3: Duplicate ID Detection | P0 | Core | ⏳ |
| 2.4: GitHub Actions Workflow | P0 | DevOps | ⏳ |
| 2.5: Build Configuration | P1 | Core | ⏳ |
| 2.6: Documentation | P2 | Docs | ⏳ |

### To Create As Issues:
- [ ] `agentctl: Implement lint command with schema validation`
- [ ] `agentctl: Implement 14 required lint rules (errors)`
- [ ] `agentctl: Implement 5 optional lint rules (warnings)`
- [ ] `agentctl: Implement verify command (hash + body consistency)`
- [ ] `agentctl: Implement repository-wide duplicate ID detection`
- [ ] `ci: Create GitHub Actions workflow for agent validation`
- [ ] `ci: Add lint/verify/test checks to CI pipeline`
- [ ] `docs: Document all lint rules and their severity`

---

## Week 3: Migration (Validation at Scale)
**Goal**: Migrate real agent and refine workflows.

| Task | Priority | Owner | Status |
|------|----------|-------|--------|
| 3.1: Real Agent Migration | P0 | Agent Owner | ⏳ |
| 3.2: CODEOWNERS File | P0 | Security | ⏳ |
| 3.3: PR Template | P1 | Core | ⏳ |
| 3.4: Agentctl Diff Command | P1 | Core | ⏳ |
| 3.5: Merge Conflict Guide | P2 | Docs | ⏳ |
| 3.6: Integration Testing | P1 | QA | ⏳ |

### To Create As Issues:
- [ ] `agentctl: Implement semantic diff command (git integration)`
- [ ] `migration: Migrate real agent to structured format (Phase 1-4)`
- [ ] `process: Create .github/CODEOWNERS with team ownership model`
- [ ] `process: Create GitHub PR template for agent changes`
- [ ] `docs: Document merge conflict resolution strategy`
- [ ] `testing: Run full CI workflow on migrated agent`

---

## Week 4: Evals & Review (Quality Gates)
**Goal**: Add evaluation framework and semantic review.

| Task | Priority | Owner | Status |
|------|----------|-------|--------|
| 4.1: Prompt Presence Eval | P0 | Core | ⏳ |
| 4.2: Agentctl Test Command | P0 | Core | ⏳ |
| 4.3: Agent Evals (3-5 per agent) | P1 | QA | ⏳ |
| 4.4: Semantic Diff Enhancement | P2 | Core | ⏳ |
| 4.5: Eval Best Practices | P2 | Docs | ⏳ |
| 4.6: Live LLM Eval (Future) | P-1 | Core | 🔮 |

### To Create As Issues:
- [ ] `agentctl: Implement prompt_presence eval runner`
- [ ] `agentctl: Implement test command with eval aggregation`
- [ ] `evals: Create 3-5 prompt_presence evals for qa-interview-agent`
- [ ] `agentctl: Enhance semantic diff for PR comments`
- [ ] `docs: Document evaluation best practices and patterns`
- [ ] `future: Design and implement live_llm eval support`

---

## Acceptance Criteria (12 items)

```
Acceptance Criteria Checklist:

✓ Developers can add/modify instructions without editing .md directly
✓ agentctl compile generates deterministic .md files
✓ agentctl lint detects invalid manifests and blocks
✓ CI fails (via agentctl verify) when compiled output inconsistent
✓ CI fails when instruction IDs are duplicated
✓ Pull requests show semantic change summaries
✓ At least one real agent migrated successfully
✓ 3+ evals exist for migrated agent
✓ Generated prompt output is reproducible
✓ Team understands instruction blocks are source of truth
✓ No duplicate instruction IDs repository-wide
✓ All supersedes/conflicts_with references resolve
```

---

## GitHub Project Labels (Suggested)

```
Priority:
- p0-blocker (blocking)
- p1-critical
- p2-high
- p3-medium
- p4-low

Type:
- feature (new capability)
- enhancement (existing improvement)
- bug (defect)
- docs (documentation)
- testing (test addition)

Area:
- agentctl (CLI tool)
- schema (data validation)
- compiler (markdown generation)
- ci (continuous integration)
- migration (agent migration)
- evals (evaluation system)

Week:
- week-1 (prototype)
- week-2 (validation)
- week-3 (migration)
- week-4 (evals)

Status:
- design (needs design review)
- ready (ready to start)
- in-progress
- in-review (PR review)
- done (completed)
```

---

## Creation Instructions

To add these to GitHub, run:

```bash
# Option 1: Create manually in GitHub UI
# 1. Create "AgentQuilt" project in daxdue/agentquilt
# 2. Go through work items above and create issues
# 3. Add to project with appropriate week/priority

# Option 2: Create via GitHub CLI (if you have project perms)
gh issue create -R daxdue/agentquilt \
  --title "Description from work item" \
  --body "Details from WBS" \
  --label "week-X,priority,area"
```

---

## How to Use This Document

1. **Project Managers**: Use this for status tracking and milestone management
2. **Developers**: Reference specific task sections (e.g., "1.2: Core Compiler") for implementation details
3. **QA**: Use Acceptance Criteria checklist to validate completion
4. **Docs**: Reference task titles as the basis for PR/issue descriptions

See `PROJECT_PLAN.md` for detailed specifications and requirements.

---

Last Updated: 2026-06-17  
Reference: `.planning/agent-maintenance-framework-spec.md`
