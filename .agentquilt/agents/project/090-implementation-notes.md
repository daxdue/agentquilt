## Important Notes for Implementation

- **TypeScript + Zod**: Schema validation will use TypeScript and Zod (see [PROJECT_PLAN.md](.planning/PROJECT_PLAN.md) 1.1).
- **No locale-aware sorting**: Fragment ordering uses Unicode code points only; never use `localeCompare()`.
- **Cross-platform hashing**: Line endings normalized to LF before hashing (SHA-256).
- **Linked fragments**: Blocks can reference other blocks via `conflicts_with`, `supersedes`, `applies_when` metadata.
- **Risk metadata**: Defaults to "medium"; explicitly set for high-risk or sensitive instructions.
- **Status filtering**: Deprecated blocks never compiled; draft blocks always excluded (an `--include-draft` flag is planned but not yet implemented).
