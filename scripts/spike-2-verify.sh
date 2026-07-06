#!/bin/bash
set -e

cat << 'EOF'
Spike 2 — Concurrent-PR Auto-Merge Test
========================================

This script validates that two branches can be merged without conflicts
when each branch adds a new fragment and edits different existing fragments.

The scenario:
  - Main has: _shared/010-tone.md, backend/010-role.md
  - Branch A adds: backend/020-build.md, edits _shared/010-tone.md
  - Branch B adds: backend/030-testing.md, edits backend/010-role.md
  - Merge A, then B → zero Git conflicts in fragments

EOF

TMPDIR=$(mktemp -d)
trap "rm -rf '$TMPDIR'" EXIT

cd "$TMPDIR"
git init --quiet
git config user.email "test@example.com"
git config user.name "Test User"

# Create initial agents directory structure
mkdir -p agents/{_shared,backend}

# Base fragments
echo "Be concise. Prefer direct, technical language." > agents/_shared/010-tone.md
echo "You are the backend service agent." > agents/backend/010-role.md

git add agents/
git commit --quiet -m "Initial: base fragments"
BASE_COMMIT=$(git rev-parse HEAD)

# Create branch A
git checkout --quiet -b branch-a
echo "Build with \`npm run build\`." > agents/backend/020-build.md
git add agents/backend/020-build.md
sed -i.bak 's/language\./language. Always be clear./' agents/_shared/010-tone.md && rm agents/_shared/010-tone.md.bak
git add agents/_shared/010-tone.md
git commit --quiet -m "Branch A: add build fragment, update tone"

# Create branch B from main
git checkout --quiet main
git checkout --quiet -b branch-b
echo "Run tests before commit." > agents/backend/030-testing.md
git add agents/backend/030-testing.md
sed -i.bak 's/service/senior service/' agents/backend/010-role.md && rm agents/backend/010-role.md.bak
git add agents/backend/010-role.md
git commit --quiet -m "Branch B: add testing fragment, update role"

# Merge both branches into main
git checkout --quiet main
git merge --quiet --no-edit branch-a
MERGE_A=$(git rev-parse HEAD)

git merge --quiet --no-edit branch-b
MERGE_B=$(git rev-parse HEAD)

# Verify no merge conflicts in fragments
STATUS=$(git status --porcelain)
if echo "$STATUS" | grep -qE "^(UU|AA|DD)"; then
  echo "✗ FAIL: Merge conflicts detected:"
  echo "$STATUS"
  exit 1
fi

echo "✓ PASS: No Git conflicts in merged fragments"
echo "✓ Spike 2 prerequisites satisfied"
exit 0
