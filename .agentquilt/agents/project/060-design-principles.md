## Key Design Principles & Locked Decisions

From the v1 spec ([agentquilt-v1-spec.md](.docs/agentquilt-v1-spec.md)):

1. **Deterministic output**: The same manifest + blocks always produce identical Markdown, enabling reproducible builds.
2. **Git-native workflow**: All source is versionable; generated files are never hand-edited.
3. **Fragment ordering**: Use gaps of 10 in numbering (`010`, `020`, `030`) to allow insertion without renumbering.
4. **Normalization**: Fragments are normalized (trailing newlines, line endings) before hashing so hash always matches output.
5. **Fragment hash excluded from metadata**: Editing tags or front-matter doesn't bump target versions.
6. **Shared fragments**: `_shared/` fragments can be included in multiple agents.
7. **Target versioning**: Merkle-style root over ordered fragments + format version—binds content, order, and format identity.
8. **No manual conflict resolution**: Conflicts become code review problems, not merge resolution.
