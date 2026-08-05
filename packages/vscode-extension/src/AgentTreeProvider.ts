import * as vscode from "vscode";
import * as path from "path";
import { readConfig } from "./configReader";
import { readLockAgents } from "./lockReader";
import { scanAgents } from "./agentScanner";
import { AgentNode } from "./model";

export class AgentTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly node?: AgentNode, // set on agent-level items only
    public readonly fragmentPath?: string, // set on fragment-level items only
  ) {
    super(label, collapsibleState);
    if (node) {
      this.id = node.dir; // stable id so VS Code preserves expand/collapse state across full-tree refreshes
      this.contextValue = "agent";
      this.description = `${node.fragments.length} fragment${node.fragments.length === 1 ? "" : "s"}`;
    }
    if (fragmentPath) {
      this.id = fragmentPath;
      this.resourceUri = vscode.Uri.file(fragmentPath);
      this.command = { command: "vscode.open", title: "Open Fragment", arguments: [this.resourceUri] };
    }
  }
}

export class AgentTreeProvider implements vscode.TreeDataProvider<AgentTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<AgentTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private cachedAgents: AgentNode[] = [];

  constructor(private readonly workspaceRoot: string) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /** Repo-relative output paths across all agents - used by the watcher to know what to watch. */
  getKnownOutputPaths(): string[] {
    return this.cachedAgents.flatMap((a) => a.outputs.map((o) => o.path));
  }

  getTreeItem(element: AgentTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AgentTreeItem): AgentTreeItem[] {
    if (!element) {
      const config = readConfig(this.workspaceRoot);
      const lockAgents = readLockAgents(this.workspaceRoot);
      this.cachedAgents = lockAgents ?? scanAgents(this.workspaceRoot, config?.sourceDir ?? ".agentquilt/agents");

      return this.cachedAgents.map(
        (agent) => new AgentTreeItem(agent.name, vscode.TreeItemCollapsibleState.Collapsed, agent),
      );
    }

    if (element.node) {
      return element.node.fragments.map((fragmentRelPath) => {
        const abs = path.join(this.workspaceRoot, fragmentRelPath);
        return new AgentTreeItem(path.basename(fragmentRelPath), vscode.TreeItemCollapsibleState.None, undefined, abs);
      });
    }

    return [];
  }
}
