import * as vscode from "vscode";
import { runCli, CliNotFoundError } from "./cliRunner";
import { getOutputChannel } from "./outputChannel";

type DriftState = "checking" | "clean" | "drifted" | "failed";

const STATE_TEXT: Record<DriftState, string> = {
  checking: "$(sync~spin) AgentQuilt: checking...",
  clean: "$(check) AgentQuilt: clean",
  drifted: "$(alert) AgentQuilt: drifted",
  failed: "$(error) AgentQuilt: check failed",
};

const DEBOUNCE_MS = 400;

export class DriftStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly workspaceRoot: string,
    private readonly getCliCommand: () => string,
  ) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "agentquilt.check";
    this.setState("checking");
    this.item.show();
  }

  show(): void {
    this.item.show();
  }

  /** Debounced recheck, triggered by watcher events. */
  scheduleCheck(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      void this.checkNow();
    }, DEBOUNCE_MS);
  }

  /** Undebounced recheck - used on activation and when the user manually clicks the status bar / runs the command. */
  async checkNow(): Promise<void> {
    this.setState("checking");
    try {
      const result = await runCli(this.workspaceRoot, this.getCliCommand(), "check");
      if (result.exitCode === 0) {
        this.setState("clean");
      } else if (result.exitCode === 1) {
        this.setState("drifted");
      } else {
        this.setState("failed");
        getOutputChannel().appendLine(result.stdout || result.stderr);
      }
    } catch (err) {
      this.setState("failed");
      const message = err instanceof CliNotFoundError ? err.message : String(err);
      getOutputChannel().appendLine(`AgentQuilt: check failed to run - ${message}`);
    }
  }

  private setState(state: DriftState): void {
    this.item.text = STATE_TEXT[state];
  }

  dispose(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.item.dispose();
  }
}
