import * as vscode from "vscode";
import { runCli, CliNotFoundError } from "./cliRunner";
import { getOutputChannel } from "./outputChannel";
import { AgentTreeProvider, AgentTreeItem } from "./AgentTreeProvider";
import { PreviewPanel } from "./PreviewPanel";
import { DriftStatusBar } from "./driftStatusBar";
import { AgentOutput } from "./model";
import { listAgentDefinitionsTargets, addPlatformToTarget, KNOWN_PLATFORMS } from "./configWriter";

interface PlatformPickItem extends vscode.QuickPickItem {
  output: AgentOutput;
}

export interface CommandDeps {
  workspaceRoot: string;
  getCliCommand: () => string;
  treeProvider: AgentTreeProvider;
  statusBar: DriftStatusBar;
}

/** Shared by the explicit "Build" command and the auto-rebuild after enabling a provider. */
async function runBuild(deps: CommandDeps, outputChannel: vscode.OutputChannel): Promise<void> {
  outputChannel.show(true);
  outputChannel.appendLine(`$ ${deps.getCliCommand()} build`);
  try {
    const result = await runCli(deps.workspaceRoot, deps.getCliCommand(), "build");
    if (result.stdout) outputChannel.append(result.stdout);
    if (result.stderr) outputChannel.append(result.stderr);
    if (result.exitCode === 0) {
      void vscode.window.showInformationMessage("AgentQuilt build succeeded");
    } else {
      void vscode.window.showErrorMessage(`AgentQuilt build failed (exit code ${result.exitCode})`);
    }
  } catch (err) {
    const message = err instanceof CliNotFoundError ? err.message : String(err);
    void vscode.window.showErrorMessage(`AgentQuilt: ${message}`);
  }
  deps.treeProvider.refresh();
  await deps.statusBar.checkNow();
}

export function registerCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
  const outputChannel = getOutputChannel();

  const build = vscode.commands.registerCommand("agentquilt.build", () => runBuild(deps, outputChannel));

  // Building directly changes drift state and output files - not just source
  // edits - so this always uses the undebounced checkNow(), same as activation.
  const check = vscode.commands.registerCommand("agentquilt.check", async () => {
    await deps.statusBar.checkNow();
  });

  const showPreview = vscode.commands.registerCommand("agentquilt.showPreview", async (item?: AgentTreeItem) => {
    const agent = item?.node;
    if (!agent) {
      void vscode.window.showWarningMessage("Select an agent in the AgentQuilt tree to preview its compiled output.");
      return;
    }

    // Single (or no) platform output: same behavior as before, no picker.
    if (agent.outputs.length <= 1) {
      PreviewPanel.showForAgent(deps.workspaceRoot, agent);
      return;
    }

    // Multiple platform outputs (e.g. claude + codex) - let the user choose which to preview.
    const pick = await vscode.window.showQuickPick<PlatformPickItem>(
      agent.outputs.map((output) => ({ label: output.platform, description: output.path, output })),
      { placeHolder: `Select a platform to preview for ${agent.name}` },
    );
    if (pick) {
      PreviewPanel.showForAgent(deps.workspaceRoot, agent, pick.output);
    }
  });

  const refreshTree = vscode.commands.registerCommand("agentquilt.refreshTree", () => {
    deps.treeProvider.refresh();
  });

  const enableProvider = vscode.commands.registerCommand("agentquilt.enableProvider", async () => {
    const targets = listAgentDefinitionsTargets(deps.workspaceRoot);
    if (targets.length === 0) {
      void vscode.window.showErrorMessage(
        "AgentQuilt: no agent-definitions target found in config. Add one to .agentquilt/config.yaml first.",
      );
      return;
    }

    let targetIndex = targets[0].index;
    let enabledPlatforms = targets[0].platforms;
    if (targets.length > 1) {
      const targetPick = await vscode.window.showQuickPick(
        targets.map((t) => ({
          label: t.sourceDir ?? "(default sourceDir)",
          description: `platforms: ${t.platforms.join(", ") || "(none)"}`,
          target: t,
        })),
        { placeHolder: "Select which agent-definitions target to enable a provider for" },
      );
      if (!targetPick) return;
      targetIndex = targetPick.target.index;
      enabledPlatforms = targetPick.target.platforms;
    }

    const available = KNOWN_PLATFORMS.filter((p) => !enabledPlatforms.includes(p));
    if (available.length === 0) {
      void vscode.window.showInformationMessage("AgentQuilt: all known platforms are already enabled for this target.");
      return;
    }

    const platform = await vscode.window.showQuickPick(available, {
      placeHolder: "Select a provider to enable",
    });
    if (!platform) return;

    const result = addPlatformToTarget(deps.workspaceRoot, targetIndex, platform);
    if (!result.ok) {
      void vscode.window.showErrorMessage(`AgentQuilt: ${result.error}`);
      return;
    }
    if (result.alreadyEnabled) {
      void vscode.window.showInformationMessage(`AgentQuilt: '${platform}' is already enabled for this target.`);
      return;
    }

    void vscode.window.showInformationMessage(`AgentQuilt: enabled '${platform}', rebuilding...`);
    await runBuild(deps, outputChannel);
  });

  context.subscriptions.push(build, check, showPreview, refreshTree, enableProvider);
}
