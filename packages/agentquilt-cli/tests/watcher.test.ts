import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { watchTree, watchFile, WatchHandle } from "../src/core/watcher.js";

// fs.watch delivers events asynchronously (fsevents on macOS batches them),
// so tests poll for the expected outcome instead of asserting immediately.
async function waitFor(condition: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error("timed out waiting for watch event");
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

// Watchers need a moment to attach before events are captured reliably.
const settle = () => new Promise((resolve) => setTimeout(resolve, 200));

describe("watchTree", () => {
  let root: string;
  let handle: WatchHandle | undefined;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "aq-watch-"));
  });

  afterEach(() => {
    handle?.close();
    handle = undefined;
    rmSync(root, { recursive: true, force: true });
  });

  it("reports changes to files in the root", async () => {
    const events: string[] = [];
    handle = watchTree(root, (p) => events.push(p));
    await settle();

    writeFileSync(path.join(root, "010-role.md"), "# Role\n");

    await waitFor(() => events.some((p) => p.endsWith("010-role.md")));
  });

  it("reports changes inside directories created after watching started", async () => {
    const events: string[] = [];
    handle = watchTree(root, (p) => events.push(p));
    await settle();

    const sub = path.join(root, "new-agent");
    mkdirSync(sub);
    await settle();
    writeFileSync(path.join(sub, "agent.yaml"), "name: new-agent\n");

    await waitFor(() => events.some((p) => p.includes("new-agent")));
  });

  it("stops reporting after close", async () => {
    const events: string[] = [];
    handle = watchTree(root, (p) => events.push(p));
    await settle();
    handle.close();
    handle = undefined;
    await settle();

    const before = events.length;
    writeFileSync(path.join(root, "020-criteria.md"), "# Criteria\n");
    await settle();

    expect(events.length).toBe(before);
  });
});

describe("watchFile", () => {
  let dir: string;
  let handle: WatchHandle | undefined;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "aq-watchfile-"));
  });

  afterEach(() => {
    handle?.close();
    handle = undefined;
    rmSync(dir, { recursive: true, force: true });
  });

  it("fires when the watched file changes", async () => {
    const target = path.join(dir, "config.yaml");
    writeFileSync(target, "version: 1\n");

    let fired = 0;
    handle = watchFile(target, () => fired++);
    await settle();

    writeFileSync(target, "version: 1\nsourceDir: agents\n");

    await waitFor(() => fired > 0);
  });

  it("stops firing after close", async () => {
    const target = path.join(dir, "config.yaml");
    writeFileSync(target, "version: 1\n");

    let fired = 0;
    handle = watchFile(target, () => fired++);
    await settle();
    handle.close();
    handle = undefined;
    await settle();

    const before = fired;
    writeFileSync(target, "version: 2\n");
    await settle();

    expect(fired).toBe(before);
  });
});
