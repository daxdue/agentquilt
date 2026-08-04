import { spawn } from "child_process";

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class CliNotFoundError extends Error {}

// POSIX shells report exit code 127 for "command not found" - since spawn()
// runs with shell:true (see below), a missing binary never reaches the
// 'error' event; it surfaces as a normal 'close' with this code instead.
// Confirmed empirically: spawn("shell:true") swallows ENOENT into the shell's
// own exit code rather than emitting a Node 'error' event.
const SHELL_COMMAND_NOT_FOUND_EXIT_CODE = 127;

/**
 * Runs `<cliCommand> <subcommand>` as a one-shot child process and resolves
 * with its exit code and captured output. Never parses stdout for status -
 * callers must key off `exitCode` per the CLI's documented contract (build/check:
 * 0 success/clean, 1 blocked/drift, 2 config error, 3 I/O error).
 *
 * Uses shell:true so a configured `cliCommand` of "npx agentquilt" (for
 * environments without a global install) resolves the same way a user typing
 * it in a terminal would, and so Windows npm-global .cmd shims resolve without
 * extra path handling.
 */
export function runCli(cwd: string, cliCommand: string, subcommand: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(`${cliCommand} ${subcommand}`, { cwd, shell: true });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      reject(new CliNotFoundError(err.message));
    });

    child.on("close", (code) => {
      if (code === SHELL_COMMAND_NOT_FOUND_EXIT_CODE) {
        reject(new CliNotFoundError(stderr.trim() || `command not found: ${cliCommand}`));
        return;
      }
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}
