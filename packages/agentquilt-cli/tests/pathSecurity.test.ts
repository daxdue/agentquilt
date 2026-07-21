import { afterEach, describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import {
  isPathContained,
  assertPathContained,
  validateOutputPaths,
  checkContained,
  assertContainedIncludingSymlinks,
  PathClaimTracker,
} from "../src/core/pathSecurity";
import { ConfigError } from "../src/core/configLoader";

describe("isPathContained", () => {
  it("is true when childPath equals parentPath", () => {
    expect(isPathContained("/repo/agents", "/repo/agents")).toBe(true);
  });

  it("is true when childPath is nested under parentPath", () => {
    expect(isPathContained("/repo/agents/foo/agent.yaml", "/repo/agents")).toBe(true);
  });

  it("is false when childPath escapes parentPath via a sibling directory", () => {
    expect(isPathContained("/repo/other", "/repo/agents")).toBe(false);
  });

  it("is false for a sibling that merely shares a path prefix (not a real child)", () => {
    // "/repo/agents-evil" starts with the string "/repo/agents" but is not
    // actually inside the "/repo/agents" directory.
    expect(isPathContained("/repo/agents-evil/agent.yaml", "/repo/agents")).toBe(false);
  });

  it("is false when childPath is an ancestor of parentPath", () => {
    expect(isPathContained("/repo", "/repo/agents")).toBe(false);
  });

  it("handles trailing separators consistently via path.sep", () => {
    const parent = path.resolve("/repo/agents");
    const child = path.resolve("/repo/agents", "foo", "agent.yaml");
    expect(isPathContained(child, parent)).toBe(true);
  });
});

describe("assertPathContained", () => {
  it("does not throw when the path is contained", () => {
    expect(() =>
      assertPathContained("/repo/agents/foo", "/repo/agents", "escaped")
    ).not.toThrow();
  });

  it("throws ConfigError with the given message when the path escapes", () => {
    expect(() =>
      assertPathContained("/repo/other", "/repo/agents", "custom escape message")
    ).toThrow(ConfigError);
    expect(() =>
      assertPathContained("/repo/other", "/repo/agents", "custom escape message")
    ).toThrow("custom escape message");
  });
});

describe("validateOutputPaths", () => {
  const tempDirs: string[] = [];
  const makeTemp = (): string => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "aq-output-path-"));
    tempDirs.push(dir);
    return dir;
  };

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects portable duplicate output paths", () => {
    const root = makeTemp();
    expect(() =>
      validateOutputPaths(root, [
        { path: "Generated/Agent.toml", owner: "document" },
        { path: "generated/agent.toml", owner: "adapter" },
      ])
    ).toThrow("output path collision");
  });

  it("rejects path aliases that resolve to the same portable output", () => {
    const root = makeTemp();
    expect(() =>
      validateOutputPaths(root, [
        { path: "generated/agent.toml", owner: "document" },
        { path: "generated/./agent.toml", owner: "adapter" },
      ])
    ).toThrow("output path collision");
  });

  it("rejects a lexical escape", () => {
    const root = makeTemp();
    expect(() =>
      validateOutputPaths(root, [{ path: "../outside.txt", owner: "document" }])
    ).toThrow("escapes the repository");
  });

  it.each(["..\\outside.txt", "C:\\outside.txt", "\\\\server\\share\\out.txt"])(
    "rejects non-portable absolute or traversal path %s",
    (outputPath) => {
      const root = makeTemp();
      expect(() =>
        validateOutputPaths(root, [{ path: outputPath, owner: "document" }])
      ).toThrow(/repository-relative|escapes the repository/);
    }
  );

  it("rejects an output-file symlink outside the repository", () => {
    const root = makeTemp();
    const outside = makeTemp();
    const outsideFile = path.join(outside, "agent.toml");
    writeFileSync(outsideFile, "outside\n");
    mkdirSync(path.join(root, "generated"));
    symlinkSync(outsideFile, path.join(root, "generated", "agent.toml"));

    expect(() =>
      validateOutputPaths(root, [{ path: "generated/agent.toml", owner: "adapter" }])
    ).toThrow("through a symlink");
  });

  it("rejects a dangling output-file symlink", () => {
    const root = makeTemp();
    const outside = makeTemp();
    mkdirSync(path.join(root, "generated"));
    symlinkSync(
      path.join(outside, "not-created.toml"),
      path.join(root, "generated", "agent.toml")
    );

    expect(() =>
      validateOutputPaths(root, [{ path: "generated/agent.toml", owner: "adapter" }])
    ).toThrow("through a symlink");
  });

  it("rejects an output symlink to another file inside the repository", () => {
    const root = makeTemp();
    mkdirSync(path.join(root, "generated"));
    writeFileSync(path.join(root, "source.yaml"), "canonical\n");
    symlinkSync(
      path.join(root, "source.yaml"),
      path.join(root, "generated", "agent.toml")
    );

    expect(() =>
      validateOutputPaths(root, [{ path: "generated/agent.toml", owner: "adapter" }])
    ).toThrow("through a symlink");
  });

  it("rejects an absent output below a symlinked parent outside the repository", () => {
    const root = makeTemp();
    const outside = makeTemp();
    symlinkSync(outside, path.join(root, "generated"), "dir");

    expect(() =>
      validateOutputPaths(root, [{ path: "generated/agent.toml", owner: "adapter" }])
    ).toThrow("through a symlink");
  });

  it("accepts an absent contained output", () => {
    const root = makeTemp();
    expect(() =>
      validateOutputPaths(root, [{ path: "generated/agent.toml", owner: "adapter" }])
    ).not.toThrow();
  });
});

describe("checkContained", () => {
  const tempDirs: string[] = [];
  const makeTemp = (): string => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "aq-contained-"));
    tempDirs.push(dir);
    return dir;
  };

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is contained (lexically and through symlinks) for a normal nested path", () => {
    const root = makeTemp();
    const nested = path.join(root, "foo", "bar");
    mkdirSync(nested, { recursive: true });
    const result = checkContained(nested, root);
    expect(result.lexicallyContained).toBe(true);
    expect(result.symlinkContained).toBe(true);
    expect(result.resolved).toBe(path.resolve(nested));
  });

  it("is lexically contained and treated as symlink-contained when the candidate doesn't exist yet", () => {
    const root = makeTemp();
    const missing = path.join(root, "not-yet-created");
    const result = checkContained(missing, root);
    expect(result.lexicallyContained).toBe(true);
    expect(result.symlinkContained).toBe(true);
  });

  it("is not lexically contained for a sibling directory", () => {
    const root = makeTemp();
    const sibling = path.join(path.dirname(root), "sibling");
    const result = checkContained(sibling, root);
    expect(result.lexicallyContained).toBe(false);
    expect(result.symlinkContained).toBe(false);
  });

  it("is lexically contained but not symlink-contained when a component escapes through a symlink", () => {
    const root = makeTemp();
    const outside = makeTemp();
    const linked = path.join(root, "linked");
    symlinkSync(outside, linked, "dir");
    const result = checkContained(linked, root);
    expect(result.lexicallyContained).toBe(true);
    expect(result.symlinkContained).toBe(false);
  });
});

describe("assertContainedIncludingSymlinks", () => {
  const tempDirs: string[] = [];
  const makeTemp = (): string => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "aq-assert-contained-"));
    tempDirs.push(dir);
    return dir;
  };

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns the resolved path when contained", () => {
    const root = makeTemp();
    const nested = path.join(root, "foo");
    mkdirSync(nested);
    expect(
      assertContainedIncludingSymlinks(nested, root, "lexical escape", "symlink escape")
    ).toBe(path.resolve(nested));
  });

  it("throws the lexical message for a traversal escape", () => {
    const root = makeTemp();
    const sibling = path.join(path.dirname(root), "sibling");
    expect(() =>
      assertContainedIncludingSymlinks(sibling, root, "lexical escape", "symlink escape")
    ).toThrow("lexical escape");
  });

  it("throws the symlink message for a symlink escape", () => {
    const root = makeTemp();
    const outside = makeTemp();
    const linked = path.join(root, "linked");
    symlinkSync(outside, linked, "dir");
    expect(() =>
      assertContainedIncludingSymlinks(linked, root, "lexical escape", "symlink escape")
    ).toThrow("symlink escape");
  });
});

describe("PathClaimTracker", () => {
  it("allows the first claim on a path", () => {
    const tracker = new PathClaimTracker();
    expect(() =>
      tracker.claim("generated/agent.toml", "owner-a", () => "collision")
    ).not.toThrow();
  });

  it("throws using the describeCollision message on a second claim", () => {
    const tracker = new PathClaimTracker();
    tracker.claim("generated/agent.toml", "owner-a", () => "collision");
    expect(() =>
      tracker.claim(
        "generated/agent.toml",
        "owner-b",
        (previousOwner) => `collision between ${previousOwner} and owner-b`
      )
    ).toThrow("collision between owner-a and owner-b");
  });

  it("treats case-differing and alias paths as the same claim (portablePathKey semantics)", () => {
    const tracker = new PathClaimTracker();
    tracker.claim("Generated/Agent.toml", "owner-a", () => "collision");
    expect(() =>
      tracker.claim("generated/agent.toml", "owner-b", () => "collision")
    ).toThrow(ConfigError);
  });

  it("allows distinct paths to be claimed independently", () => {
    const tracker = new PathClaimTracker();
    expect(() => {
      tracker.claim("a.toml", "owner-a", () => "collision");
      tracker.claim("b.toml", "owner-b", () => "collision");
    }).not.toThrow();
  });
});
