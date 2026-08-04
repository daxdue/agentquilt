import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { marked } from "marked";
import { parse as parseToml } from "smol-toml";
import { AgentNode, AgentOutput } from "./model";

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Renders markdown to real HTML (headers, bold, lists, code) entirely on the
// extension side - the webview has enableScripts:false and the strictest CSP
// (default-src 'none'), so this is static markup, not a client-side renderer.
// marked doesn't sanitize its output, but that's moot here: the CSP already
// blocks all script execution regardless of what tags appear in the content,
// and the content is always a local repo file the user already trusts.
function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

/** Splits `---\n...\n---` YAML frontmatter (as Claude's adapter emits) from the markdown body below it. */
function splitFrontmatter(content: string): { frontmatter?: string; body: string } {
  if (!content.startsWith("---\n")) return { body: content };
  const closingIndex = content.indexOf("\n---", 4);
  if (closingIndex === -1) return { body: content };
  const frontmatter = content.slice(4, closingIndex).trim();
  const body = content.slice(closingIndex + 4).replace(/^\r?\n/, "");
  return { frontmatter, body };
}

function renderMarkdownFile(content: string): string {
  const { frontmatter, body } = splitFrontmatter(content);
  const frontmatterHtml = frontmatter ? `<pre class="frontmatter">${escapeHtml(frontmatter)}</pre>` : "";
  return frontmatterHtml + renderMarkdown(body);
}

/**
 * TOML basic strings escape embedded newlines as literal "\n" - valid TOML,
 * but unreadable dumped raw (a multi-line instructions field becomes one huge
 * line). Parses with the same library the CLI uses to write these files
 * (smol-toml), shows short scalar fields plainly, and renders multi-line
 * string fields (e.g. developer_instructions, which is markdown prose) through
 * the same markdown renderer as the .md preview. Falls back to raw escaped
 * content if the file doesn't parse as TOML.
 */
function renderTomlFile(raw: string): string {
  let parsed: Record<string, unknown>;
  try {
    parsed = parseToml(raw);
  } catch {
    return `<pre>${escapeHtml(raw)}</pre>`;
  }

  const sections: string[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string" && value.includes("\n")) {
      sections.push(`<h2 class="field-name">${escapeHtml(key)}</h2>${renderMarkdown(value)}`);
    } else {
      sections.push(
        `<div class="field"><span class="field-name">${escapeHtml(key)}</span> = ${escapeHtml(JSON.stringify(value))}</div>`,
      );
    }
  }
  return sections.join("\n");
}

function renderHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <style>
    body {
      font-family: var(--vscode-font-family, sans-serif);
      color: var(--vscode-editor-foreground);
      padding: 1rem 1.5rem;
    }
    h1, h2, h3, h4 {
      border-bottom: 1px solid var(--vscode-panel-border, #444);
      padding-bottom: 0.3em;
    }
    code {
      font-family: var(--vscode-editor-font-family, monospace);
      background: var(--vscode-textCodeBlock-background, rgba(127,127,127,0.15));
      padding: 0.1em 0.3em;
      border-radius: 3px;
    }
    pre {
      font-family: var(--vscode-editor-font-family, monospace);
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    pre.frontmatter {
      background: var(--vscode-textCodeBlock-background, rgba(127,127,127,0.15));
      padding: 0.6em 0.8em;
      border-radius: 3px;
    }
    pre code { background: none; padding: 0; }
    ul, ol { padding-left: 1.4em; }
    a { color: var(--vscode-textLink-foreground); }
    blockquote {
      border-left: 3px solid var(--vscode-textBlockQuote-border, #555);
      margin: 0;
      padding-left: 1em;
      color: var(--vscode-textBlockQuote-foreground, inherit);
    }
    .field { font-family: var(--vscode-editor-font-family, monospace); margin-bottom: 0.3em; }
    .field-name { font-weight: bold; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

export class PreviewPanel {
  private static current: PreviewPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private currentOutputPath: string | undefined;

  private constructor() {
    this.panel = vscode.window.createWebviewPanel(
      "agentquiltPreview",
      "AgentQuilt Preview",
      vscode.ViewColumn.Beside,
      { enableScripts: false },
    );
    this.panel.onDidDispose(() => {
      PreviewPanel.current = undefined;
    });
  }

  /**
   * Shows the compiled output for an agent. If `output` is omitted, defaults
   * to the agent's first platform output (single-platform case, unchanged
   * behavior). Callers with multiple platforms (e.g. claude + codex) should
   * resolve which one first (see commands.ts's platform quick-pick) and pass
   * it explicitly.
   */
  static showForAgent(workspaceRoot: string, agent: AgentNode, output?: AgentOutput): void {
    if (!PreviewPanel.current) {
      PreviewPanel.current = new PreviewPanel();
    }
    PreviewPanel.current.render(workspaceRoot, agent, output);
    PreviewPanel.current.panel.reveal(vscode.ViewColumn.Beside);
  }

  /** Called by the watcher on output-file changes; no-ops if the panel is closed or showing something else. */
  static refreshIfOpen(changedAbsPath: string): void {
    if (!PreviewPanel.current) return;
    if (PreviewPanel.current.currentOutputPath !== changedAbsPath) return;
    PreviewPanel.current.renderFromPath(changedAbsPath, PreviewPanel.current.panel.title);
  }

  private render(workspaceRoot: string, agent: AgentNode, explicitOutput?: AgentOutput): void {
    const output = explicitOutput ?? agent.outputs[0];
    if (!output) {
      this.currentOutputPath = undefined;
      this.panel.title = `AgentQuilt Preview — ${agent.name}`;
      this.panel.webview.html = renderHtml("<p>No compiled output yet — run AgentQuilt: Build.</p>");
      return;
    }

    const title = `AgentQuilt Preview — ${agent.name} (${output.platform})`;
    const absPath = path.join(workspaceRoot, output.path);
    this.renderFromPath(absPath, title);
  }

  private renderFromPath(absPath: string, title: string): void {
    this.currentOutputPath = absPath;
    this.panel.title = title;
    try {
      const raw = fs.readFileSync(absPath, "utf8");
      let bodyHtml: string;
      if (absPath.endsWith(".toml")) {
        bodyHtml = renderTomlFile(raw);
      } else if (absPath.endsWith(".md")) {
        bodyHtml = renderMarkdownFile(raw);
      } else {
        bodyHtml = `<pre>${escapeHtml(raw)}</pre>`;
      }
      this.panel.webview.html = renderHtml(bodyHtml);
    } catch {
      this.panel.webview.html = renderHtml(`<p>Could not read ${escapeHtml(absPath)}.</p>`);
    }
  }
}
