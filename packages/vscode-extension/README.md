# AgentQuilt for VS Code

Visualize [AgentQuilt](https://agentquilt.dev) fragment compilation directly in the editor: agents, fragments, compiled output, and drift state, without leaving VS Code.

AgentQuilt compiles structured agent instruction sources (`.agentquilt/agents/<name>/`) into deterministic output — `AGENTS.md`, `CLAUDE.md`, `.claude/agents/*.md`, `.codex/agents/*.toml`, and more, depending on which platforms a project targets. This extension gives that compiled state a visible, live surface inside the editor.

## Prerequisites

The [`agentquilt` CLI](https://www.npmjs.com/package/agentquilt) must be installed and reachable — either globally (`npm install -g agentquilt`) or via `npx agentquilt` (see the `agentquilt.cliCommand` setting below). The extension shells out to the CLI; it doesn't reimplement any compilation logic itself.

## Features

- **Agent tree** — a sidebar view of every agent and its fragments, read from `agentquilt.lock` (falls back to a directory scan if no lock file exists yet, e.g. before the first build).
- **Live preview** — click an agent to see its compiled output rendered properly (Markdown via `marked`, Codex's TOML `developer_instructions` decoded into readable prose), not a raw file dump. If an agent compiles to more than one platform (e.g. Claude and Codex), you're prompted to pick which one to preview.
- **Drift status bar** — shows at a glance whether compiled output matches source (`agentquilt check`, debounced on any relevant file change).
- **Auto-rebuild on save** — editing and saving a fragment or agent manifest automatically runs `agentquilt build`, so the compiled output and the drift status stay current without a manual step. Controlled by `agentquilt.autoRebuildOnSave` (see below).
- **Build / Check commands** — available from the Command Palette and the tree view's toolbar.
- **Enable Provider** — adds a new platform (e.g. `codex`) to an `agent-definitions` target in `.agentquilt/config.yaml`, preserving existing comments and formatting, then rebuilds.

## Settings

| Setting | Default | Description |
|---|---|---|
| `agentquilt.cliCommand` | `"agentquilt"` | Command used to invoke the AgentQuilt CLI (e.g. `agentquilt` or `npx agentquilt`, for projects without a global install). |
| `agentquilt.autoRebuildOnSave` | `true` | Automatically run `agentquilt build` when a source fragment or agent manifest under `.agentquilt/` changes. Turn off to require an explicit **AgentQuilt: Build** instead. |

## Commands

| Command | Description |
|---|---|
| `AgentQuilt: Build` | Compile all targets, write outputs and the lock file. |
| `AgentQuilt: Check` | Check compiled output against source (drift detection). |
| `AgentQuilt: Show Compiled Output` | Open the live preview for the selected agent. |
| `AgentQuilt: Refresh Agent Tree` | Re-scan the source tree. |
| `AgentQuilt: Enable Provider...` | Add a platform to an `agent-definitions` target and rebuild. |

## For maintainers: packaging and publishing

This extension is built with `esbuild` (`bundle: true`, only `vscode` marked external — see `esbuild.js`), so `dist/extension.js` already contains everything it needs at runtime; nothing under `node_modules` needs to ship separately.

**Always pass `--no-dependencies`** when running `vsce package` or `vsce publish` directly (`npm run vscode:package` already does this correctly — prefer that script). In this npm workspace, `vsce`'s dependency-bundling pass (the default when `--no-dependencies` is omitted) follows the workspace's `node_modules` symlinks and sweeps in sibling packages and unrelated repo content, which fails outright (`ERROR invalid relative path: extension/../../...`) rather than producing a bloated-but-working `.vsix`. This isn't a workaround for a one-off bug — it's the correct flag for any `esbuild`-bundled extension, and it's required here specifically because of the workspace layout:

```bash
npx vsce publish --no-dependencies
```

## License

MIT
