import * as vscode from "vscode";
import * as path from "path";
import { AgentTreeProvider } from "./AgentTreeProvider";
import { DriftStatusBar } from "./driftStatusBar";
import { AgentQuiltWatcher } from "./watcher";
import { PreviewPanel } from "./PreviewPanel";
import { registerCommands } from "./commands";
import { AutoRebuilder } from "./autoRebuild";

function getCliCommand(): string {
  return vscode.workspace.getConfiguration("agentquilt").get<string>("cliCommand", "agentquilt");
}

function getAutoRebuildEnabled(): boolean {
  return vscode.workspace.getConfiguration("agentquilt").get<boolean>("autoRebuildOnSave", true);
}

export function activate(context: vscode.ExtensionContext): void {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    void vscode.window.showWarningMessage("AgentQuilt: open a folder/workspace to use this extension.");
    return;
  }
  const workspaceRoot = workspaceFolder.uri.fsPath;

  const treeProvider = new AgentTreeProvider(workspaceRoot);
  const treeView = vscode.window.registerTreeDataProvider("agentquiltAgents", treeProvider);

  const statusBar = new DriftStatusBar(workspaceRoot, getCliCommand);

  const autoRebuilder = new AutoRebuilder(workspaceRoot, getCliCommand, getAutoRebuildEnabled);

  const watcher = new AgentQuiltWatcher(workspaceFolder);
  watcher.onDidChange((event) => {
    if (event.kind === "source" || event.kind === "lock") {
      // getChildren(undefined) recomputes cachedAgents from disk synchronously;
      // refresh() only fires the tree-changed event, which VS Code re-queries
      // lazily - reading getKnownOutputPaths() before this call would return
      // last cycle's stale agent list.
      treeProvider.getChildren();
      watcher.updateOutputWatchers(treeProvider.getKnownOutputPaths());
      treeProvider.refresh();
    }
    if (event.kind === "output") {
      PreviewPanel.refreshIfOpen(path.join(workspaceRoot, event.uri));
    }
    if (event.kind === "source") {
      autoRebuilder.scheduleRebuild();
    }
    statusBar.scheduleCheck();
  });
  // Seed output watchers from whatever the tree already knows (e.g. from a
  // pre-existing lock file) before the first change event ever fires.
  // getChildren(undefined) populates the tree's agent cache as a side effect.
  treeProvider.getChildren();
  watcher.updateOutputWatchers(treeProvider.getKnownOutputPaths());

  registerCommands(context, { workspaceRoot, getCliCommand, treeProvider, statusBar });

  void statusBar.checkNow();

  context.subscriptions.push(treeView, statusBar, watcher, autoRebuilder);
}

export function deactivate(): void {
  // context.subscriptions handles disposal; nothing extra needed.
}
