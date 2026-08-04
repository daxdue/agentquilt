import * as vscode from "vscode";
import { runCli, CliNotFoundError } from "./cliRunner";
import { getOutputChannel } from "./outputChannel";

const DEBOUNCE_MS = 600;

/**
 * Debounced `agentquilt build` triggered by source-fragment saves. Only ever
 * called for watcher "source" events (.agentquilt/**) - build never writes
 * under .agentquilt/, so this can't be triggered by its own output (build's
 * writes to agentquilt.lock and compiled outputs surface as "lock"/"output"
 * watcher events instead, which the existing onDidChange handler already
 * reacts to for tree/status-bar refresh - nothing to duplicate here).
 *
 * Silent on success; failure is reported via output channel + notification,
 * since a rebuild fires far more often than a manual Build click.
 */
export class AutoRebuilder implements vscode.Disposable {
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private pending = false;

  constructor(
    private readonly workspaceRoot: string,
    private readonly getCliCommand: () => string,
    private readonly isEnabled: () => boolean,
  ) {}

  /** Debounced entry point, called from the "source" watcher event. */
  scheduleRebuild(): void {
    if (!this.isEnabled()) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      void this.runNow();
    }, DEBOUNCE_MS);
  }

  private async runNow(): Promise<void> {
    if (!this.isEnabled()) return;

    if (this.running) {
      // A source change landed mid-build; coalesce into one more run after
      // this one finishes rather than overlapping child processes.
      this.pending = true;
      return;
    }

    this.running = true;
    try {
      const result = await runCli(this.workspaceRoot, this.getCliCommand(), "build");
      if (result.exitCode !== 0) {
        const channel = getOutputChannel();
        channel.appendLine(`$ ${this.getCliCommand()} build (auto-rebuild, exit code ${result.exitCode})`);
        if (result.stdout) channel.append(result.stdout);
        if (result.stderr) channel.append(result.stderr);
        channel.show(true);
        void vscode.window.showErrorMessage(
          `AgentQuilt: auto-rebuild failed (exit code ${result.exitCode}). See output panel.`,
        );
      }
    } catch (err) {
      const message = err instanceof CliNotFoundError ? err.message : String(err);
      getOutputChannel().appendLine(`AgentQuilt: auto-rebuild failed to run - ${message}`);
      void vscode.window.showErrorMessage(`AgentQuilt: auto-rebuild failed to run - ${message}`);
    } finally {
      this.running = false;
      if (this.pending) {
        this.pending = false;
        this.scheduleRebuild();
      }
    }
  }

  dispose(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }
}
