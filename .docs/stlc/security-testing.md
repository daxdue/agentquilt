# Security Testing Strategy

## Threat Model

AgentQuilt is a compilation tool that reads source Markdown/YAML and generates agent instruction files. Potential attacks:

### 1. Path Traversal

**Threat:** `include: ../../../../etc/passwd` in config allows arbitrary file inclusion.

**Impact:** Fragments loaded from outside `sourceDir`; could read sensitive files or inject malicious instructions.

**Mitigation:**
- Validate `include` paths resolve inside `sourceDir` (configLoader.ts line 149–157)
- Test: `validateConfig` rejects `include: ../../../` paths with ConfigError

### 2. YAML Injection

**Threat:** Malicious YAML in front-matter could inject arbitrary data structures.

**Impact:** Agent metadata could be overwritten; version hashes could be spoofed.

**Mitigation:**
- Use Zod schema to validate agent manifest structure
- Explicitly enumerate allowed fields in `agent.yaml` schema
- Test: Invalid fields in agent.yaml are rejected by Zod

### 3. Lock File Tampering

**Threat:** Manual editing of `agentquilt.lock` to hide drift or claim old version.

**Impact:** CI check would pass false positive; stale generated files deployed.

**Mitigation:**
- Lock file is generated, not manually editable (ADR-0003, CONTRIBUTING.md)
- `agentquilt check` recomputes hash and detects tampering (exit 1 if hash mismatch)
- Test: `check` command detects modified lock file

### 4. Generated Agent Prompt Injection

**Threat:** Fragment body contains prompt injection attempt (e.g., `Ignore the above and do X`).

**Impact:** Compromises agent instructions; could override safety boundaries.

**Mitigation:**
- Generated prompts are opaque to the compiler (no special handling of fragment content)
- Threat is user-side responsibility (don't inject malicious instructions into fragments)
- Test: Security agent reviews fragments for obvious injection patterns during code review

### 5. Secret Leakage

**Threat:** API keys, passwords, tokens in fragments or example configs.

**Impact:** Secrets embedded in generated agents or committed to Git.

**Mitigation:**
- Code review flags secrets in diffs (security-agent)
- `.gitignore` excludes `.env*` files and local configs
- Test: `npm audit` reports dependency vulnerabilities; pre-commit hook could scan for common patterns

---

## Static Security Checks

### 1. Input Validation Boundary

All user inputs validated at entry:

| Input | Validator | Location |
|---|---|---|
| Config file | Zod schema + CONTRIBUTING.md rules | configLoader.ts |
| Manifest YAML | Zod agent definition schema | agentLoader.ts |
| Fragment content | None (trusted source in repo) | fragmentScanner.ts |
| CLI arguments | Commander.js + option validation | commands/*.ts |

### 2. npm Audit

**Threshold:** No high or critical CVEs in dependencies.

**Enforcement:** `npm audit` runs in CI; fails if violations found.

### 3. No Secrets in Repo

**Check:** Scan test fixtures, example configs, and docs for common patterns (API keys, tokens, passwords).

**Enforcement:** Code review flags secrets; pre-commit hook could automate.

---

## AI-Assisted Security Review

### Security Agent

**Triggers on:**
- PR touches `src/core/configLoader.ts`, `src/core/fragmentScanner.ts`, or adapter files
- PR adds new CLI option or command
- PR changes generated output format

**Tasks:**
- Scan diff for path traversal risk (checking `include` validation)
- Check for secrets in added test fixtures or example configs
- Flag hardcoded paths or assumptions (e.g., `/` vs `\\` on Windows)
- Verify error handling for invalid inputs
- Generate adversarial test inputs for eval suite (e.g., `include: ../../../`)

**Output:** Security findings with risk level and mitigation suggestions. Examples:

```
🔴 HIGH: Line 150 does not validate include paths against sourceDir.
         Recommend: Add check `if (!resolvePath.startsWith(normSourceDir)) throw ConfigError`
         
🟡 MEDIUM: No test for Path traversal. Recommend: Add test case with `include: ../../../../etc/passwd`
```

**Does not:**
- Approve the PR
- Block merges
- Skip security review

---

## Dependency Security

### npm Audit

**Command:** `npm audit --production` (checks only prod dependencies, not devDeps).

**Threshold:** Zero high/critical CVEs allowed. Low/medium tracked in risk register.

**Enforcement:** Add to CI workflow.

### Dependency Policy

- Minimize production dependencies (currently: commander, yaml, zod — all well-maintained)
- Pin minor versions in `package.json` to avoid unexpected updates
- Review all new dependencies for security history and maintenance status

---

## Security Testing Roadmap

### Week 2

- Add `npm audit` to CI (fail on high/critical)
- Add path traversal test to configLoader.test.ts
- security-agent enabled for PR review

### Week 3

- Add prompt injection resistance checks to eval suite
- Audit all test fixtures for secrets (grep for `key:`, `token:`, `password:`)

### Week 4

- Pre-commit hook for secret detection (optional, can be tooling outside repo)
- Security audit of adapter output encoding (ensure no injection vectors)
