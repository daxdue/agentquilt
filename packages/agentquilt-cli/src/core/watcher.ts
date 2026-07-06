import { watch, FSWatcher, readdirSync } from "fs";
import path from "path";

export interface WatchHandle {
  close(): void;
}

/**
 * Watch a directory tree and invoke onEvent with the absolute path of the
 * changed entry (best effort — some platforms report only the root).
 *
 * Uses fs.watch({ recursive: true }) where available (macOS, Windows,
 * Linux with Node >= 20). Falls back to one non-recursive watcher per
 * directory, adding watchers for directories created while watching.
 */
export function watchTree(root: string, onEvent: (filePath: string) => void): WatchHandle {
  try {
    const watcher = watch(root, { recursive: true }, (_event, filename) => {
      onEvent(filename ? path.join(root, filename.toString()) : root);
    });
    return { close: () => watcher.close() };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM") {
      throw err;
    }
    return watchTreeManually(root, onEvent);
  }
}

function watchTreeManually(root: string, onEvent: (filePath: string) => void): WatchHandle {
  const watchers = new Map<string, FSWatcher>();

  const addDir = (dir: string): void => {
    if (watchers.has(dir)) return;

    let watcher: FSWatcher;
    try {
      watcher = watch(dir, (_event, filename) => {
        const changed = filename ? path.join(dir, filename.toString()) : dir;
        // A new subdirectory needs its own watcher; scanning on every event
        // is cheap at fragment-tree scale and also prunes deleted dirs.
        scanDir(dir);
        onEvent(changed);
      });
    } catch {
      return; // Directory vanished between scan and watch
    }

    watcher.on("error", () => removeDir(dir));
    watchers.set(dir, watcher);
    scanDir(dir);
  };

  const removeDir = (dir: string): void => {
    const watcher = watchers.get(dir);
    if (watcher) {
      watcher.close();
      watchers.delete(dir);
    }
  };

  const scanDir = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      removeDir(dir);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        addDir(path.join(dir, entry.name));
      }
    }
  };

  addDir(root);

  return {
    close: () => {
      for (const watcher of watchers.values()) {
        watcher.close();
      }
      watchers.clear();
    },
  };
}

/**
 * Watch a single file for changes. Watches the parent directory and filters
 * by name so the subscription survives editors that replace the file via
 * rename (vim, many IDEs).
 *
 * Events are "possibly changed" signals, not guarantees: macOS fsevents may
 * replay recent directory history when a watcher starts, and events with a
 * null filename are passed through. Callers must debounce and treat rebuilds
 * as idempotent.
 */
export function watchFile(filePath: string, onEvent: () => void): WatchHandle {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const watcher = watch(dir, (_event, filename) => {
    if (!filename || filename.toString() === base) {
      onEvent();
    }
  });
  return { close: () => watcher.close() };
}
