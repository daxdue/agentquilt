# Release Process

## Overview

Releases follow the milestone roadmap defined in [roadmap.md](..//roadmap.md). The release unit is a semver version tag (`v0.x.0`). npm publish is the primary distribution channel.

---

## Release Checklist (G6 Gate)

Before cutting any release, all of the following must be true:

- [ ] All tests pass on `main` (`npm test -- --run` exits 0)
- [ ] Typecheck clean (`npx tsc --project tsconfig.test.json` exits 0)
- [ ] Drift check passes (`node dist/index.js check` exits 0 against the repo's own config)
- [ ] `CHANGELOG.md` updated with entries for all user-visible changes since last release
- [ ] `package.json` version bumped to the new version
- [ ] No open critical or high-severity issues in the risk register
- [ ] Migration notes written if any manifest format or CLI command changed

---

## Step-by-Step

### 1. Prepare the release branch

```bash
git checkout main && git pull
git checkout -b release/v<VERSION>
```

### 2. Bump version

Edit `packages/agentquilt/package.json`:

```json
"version": "0.x.0"
```

### 3. Update CHANGELOG.md

Add a new section at the top:

```markdown
## [0.x.0] — YYYY-MM-DD

### Added
- ...

### Fixed
- ...

### Changed
- ...
```

### 4. Regenerate outputs

```bash
cd packages/agentquilt && npm run build
node dist/index.js build   # from repo root
node dist/index.js check   # must exit 0
```

### 5. Commit and open PR

```bash
git add packages/agentquilt/package.json CHANGELOG.md agentquilt.lock AGENTS.md
git commit -m "chore(release): prepare v<VERSION>"
```

Open a PR against `main` titled `chore(release): v<VERSION>`. It must pass all CI gates.

### 6. Tag and publish

After merge:

```bash
git tag v<VERSION>
git push origin v<VERSION>
```

The `release.yml` CI workflow (to be implemented — see [roadmap.md](../roadmap.md) Week 4) will automatically publish to npm on tag push.

Until the workflow exists, publish manually:

```bash
cd packages/agentquilt && npm publish
```

---

## Versioning Policy

- **Patch** (`0.x.Y`): bug fixes with no manifest format or CLI command changes
- **Minor** (`0.X.0`): new features, new commands, new adapter support
- **Major** (`X.0.0`): breaking changes to manifest format, lock format, or CLI behavior (reserved for post-v1.0.0)

During pre-release (`0.x`), minor versions may include breaking changes with ADR documentation.
