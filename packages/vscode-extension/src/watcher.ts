import * as vscode from "vscode";
import { WatchEvent, WatchEventKind } from "./model";

/**
 * Centralizes all fs watching for the extension: source fragments/config under
 * .agentquilt/**, the root agentquilt.lock, and a dynamic set of generated
 * output paths (derived from config/lock, updated via updateOutputWatchers).
 *
 * Fires one tagged event per change, undebounced - each subscriber (tree
 * provider, preview panel, status bar) applies its own debounce window rather
 * than sharing one, since they want different latencies (UI wants to feel
 * instant, the status bar's `agentquilt check` subprocess wants to coalesce).
 */
export class AgentQuiltWatcher implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<WatchEvent>();
  readonly onDidChange = this.emitter.event;

  private readonly staticDisposables: vscode.Disposable[] = [];
  private readonly outputWatchers = new Map<string, vscode.Disposable[]>();

  constructor(private readonly workspaceFolder: vscode.WorkspaceFolder) {
    this.wire(
      vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceFolder, ".agentquilt/**")),
      "source",
      this.staticDisposables,
    );
    this.wire(
      vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceFolder, "agentquilt.lock")),
      "lock",
      this.staticDisposables,
    );
  }

  private wire(watcher: vscode.FileSystemWatcher, kind: WatchEventKind, bucket: vscode.Disposable[]): void {
    const fire = (uri: vscode.Uri) => {
      this.emitter.fire({ kind, uri: vscode.workspace.asRelativePath(uri, false) });
    };
    bucket.push(watcher, watcher.onDidCreate(fire), watcher.onDidChange(fire), watcher.onDidDelete(fire));
  }

  /**
   * Recreates watchers for the given repo-relative generated-output paths,
   * diffed against the current set so unchanged paths keep their watcher
   * (avoids needless dispose/recreate churn on every tree refresh).
   */
  updateOutputWatchers(relativePaths: string[]): void {
    const next = new Set(relativePaths);

    for (const [existingPath, disposables] of this.outputWatchers) {
      if (!next.has(existingPath)) {
        disposables.forEach((d) => d.dispose());
        this.outputWatchers.delete(existingPath);
      }
    }

    for (const relativePath of relativePaths) {
      if (this.outputWatchers.has(relativePath)) continue;
      const disposables: vscode.Disposable[] = [];
      this.wire(
        vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this.workspaceFolder, relativePath)),
        "output",
        disposables,
      );
      this.outputWatchers.set(relativePath, disposables);
    }
  }

  dispose(): void {
    this.staticDisposables.forEach((d) => d.dispose());
    this.outputWatchers.forEach((disposables) => disposables.forEach((d) => d.dispose()));
    this.outputWatchers.clear();
    this.emitter.dispose();
  }
}
