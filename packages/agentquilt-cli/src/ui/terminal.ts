/**
 * Terminal UI helpers: ANSI colors, status symbols, a lightweight spinner,
 * and duration formatting. Zero dependencies.
 *
 * Color and animation are enabled only when writing to a TTY, and respect
 * NO_COLOR / FORCE_COLOR, so piped and CI output stays plain text.
 */

function supportsColor(stream: NodeJS.WriteStream): boolean {
  if ("NO_COLOR" in process.env) return false;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") return true;
  return stream.isTTY === true && process.env.TERM !== "dumb";
}

const colorEnabled = supportsColor(process.stdout);

function style(open: number, close: number): (text: string) => string {
  return (text: string) =>
    colorEnabled ? `\x1b[${open}m${text}\x1b[${close}m` : text;
}

export const bold = style(1, 22);
export const dim = style(2, 22);
export const red = style(31, 39);
export const green = style(32, 39);
export const yellow = style(33, 39);
export const cyan = style(36, 39);

/** Status symbols, pre-colored when color is enabled. */
export const sym = {
  ok: green("✓"),
  fail: red("✗"),
  warn: yellow("!"),
  arrow: cyan("→"),
};

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export interface Spinner {
  start(): Spinner;
  /** Change the label while spinning. */
  update(text: string): void;
  /** Stop and erase the spinner line, restoring the cursor. */
  stop(): void;
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL_MS = 80;

let cursorRestoreInstalled = false;

/**
 * Create a spinner that renders on stderr (stdout stays clean for piping).
 * When stderr is not an interactive terminal the spinner is a no-op.
 */
export function createSpinner(text: string): Spinner {
  const stream = process.stderr;
  const animated = supportsColor(stream);
  let label = text;
  let frame = 0;
  let timer: NodeJS.Timeout | undefined;

  const render = (): void => {
    const glyph = colorEnabled
      ? `\x1b[36m${SPINNER_FRAMES[frame]}\x1b[39m`
      : SPINNER_FRAMES[frame];
    frame = (frame + 1) % SPINNER_FRAMES.length;
    stream.write(`\r\x1b[2K${glyph} ${label}`);
  };

  const spinner: Spinner = {
    start() {
      if (!animated || timer) return spinner;
      if (!cursorRestoreInstalled) {
        // Never leave the cursor hidden, even on SIGINT or process.exit.
        process.on("exit", () => stream.write("\x1b[?25h"));
        cursorRestoreInstalled = true;
      }
      stream.write("\x1b[?25l");
      render();
      timer = setInterval(render, SPINNER_INTERVAL_MS);
      return spinner;
    },
    update(next: string) {
      label = next;
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = undefined;
      stream.write("\r\x1b[2K\x1b[?25h");
    },
  };

  return spinner;
}
