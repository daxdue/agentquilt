import { existsSync, lstatSync, realpathSync } from "fs";
import path from "path";
import { ConfigError } from "./configLoader.js";

/**
 * True if `childPath` is `parentPath` itself or lives somewhere underneath
 * it. Both paths must already be resolved (absolute, no `..` segments) by
 * the caller — this is a pure string comparison, not a filesystem check.
 */
export function isPathContained(childPath: string, parentPath: string): boolean {
  return childPath === parentPath || childPath.startsWith(parentPath + path.sep);
}

/**
 * Throws ConfigError(message) unless childPath is contained within
 * parentPath. See isPathContained for the containment definition.
 */
export function assertPathContained(
  childPath: string,
  parentPath: string,
  message: string
): void {
  if (!isPathContained(childPath, parentPath)) {
    throw new ConfigError(message);
  }
}

export interface ContainmentCheck {
  /** The resolved (absolute) candidate path. */
  resolved: string;
  /** True if `resolved` is lexically inside root (no filesystem access). */
  lexicallyContained: boolean;
  /**
   * True if `resolved` is still contained once symlinks are resolved, or if
   * `resolved` doesn't exist yet (nothing to resolve). False only when
   * `resolved` exists and its real path escapes root's real path through a
   * symlink. Only meaningful when `lexicallyContained` is true.
   */
  symlinkContained: boolean;
}

/**
 * Resolve `candidate` against `root` and check containment both lexically
 * (string comparison) and, if `candidate` exists, through symlinks
 * (`realpathSync` on both sides). Callers that need to throw immediately
 * should use `assertContainedIncludingSymlinks`; callers that accumulate
 * multiple validation errors before reporting (e.g. `validateConfig`) should
 * inspect the returned flags directly.
 */
export function checkContained(candidate: string, root: string): ContainmentCheck {
  const resolved = path.resolve(candidate);
  const resolvedRoot = path.resolve(root);
  const lexicallyContained = isPathContained(resolved, resolvedRoot);
  const symlinkContained =
    !lexicallyContained || !existsSync(resolved)
      ? lexicallyContained
      : isPathContained(realpathSync(resolved), realpathSync(resolvedRoot));
  return { resolved, lexicallyContained, symlinkContained };
}

/**
 * Throwing wrapper over `checkContained` for callers that want a single
 * resolve-and-verify call rather than inspecting the result themselves.
 * Returns the resolved candidate path on success.
 */
export function assertContainedIncludingSymlinks(
  candidate: string,
  root: string,
  lexicalMessage: string,
  symlinkMessage: string
): string {
  const check = checkContained(candidate, root);
  if (!check.lexicallyContained) throw new ConfigError(lexicalMessage);
  if (!check.symlinkContained) throw new ConfigError(symlinkMessage);
  return check.resolved;
}

export interface OutputPathClaim {
  path: string;
  owner: string;
}

/**
 * Tracks which owner has claimed each portable output path, throwing on a
 * second claim. Compile-time (per-target and cross-target merge) and the
 * final output-inventory gate each need their own tracker instance — they
 * differ in scope (what's been compiled so far) — but share this claim/throw
 * logic so a future change to collision semantics only has one place to land.
 */
export class PathClaimTracker {
  private readonly ownersByKey = new Map<string, string>();

  claim(claimPath: string, owner: string, describeCollision: (previousOwner: string) => string): void {
    const key = portablePathKey(claimPath);
    const previousOwner = this.ownersByKey.get(key);
    if (previousOwner !== undefined) {
      throw new ConfigError(describeCollision(previousOwner));
    }
    this.ownersByKey.set(key, owner);
  }
}

export function portablePathKey(value: string): string {
  return path.posix
    .normalize(value.replace(/\\/g, "/"))
    .normalize("NFC")
    .toLowerCase();
}

function nearestExistingPath(candidate: string): string {
  let current = candidate;
  while (!existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return current;
}

/** Resolve the physical destination of a path that may not exist yet. */
export function prospectiveRealPath(candidate: string): string {
  const resolved = path.resolve(candidate);
  const existing = nearestExistingPath(resolved);
  const suffix = path.relative(existing, resolved);
  return path.resolve(realpathSync(existing), suffix);
}

function rejectSymlinkComponents(
  resolvedRoot: string,
  resolvedOutput: string,
  displayPath: string
): void {
  const relative = path.relative(resolvedRoot, resolvedOutput);
  let current = resolvedRoot;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        throw new ConfigError(
          `Generated output path escapes or aliases through a symlink: "${displayPath}"`
        );
      }
    } catch (error) {
      if (error instanceof ConfigError) throw error;
      if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
      throw error;
    }
  }
}

/** Validate the complete output set before build/check performs output I/O. */
export function validateOutputPaths(
  repoRoot: string,
  claims: OutputPathClaim[]
): Map<string, string> {
  const resolvedRoot = path.resolve(repoRoot);
  const realRoot = realpathSync(resolvedRoot);
  const claimTracker = new PathClaimTracker();
  const resolvedByPath = new Map<string, string>();

  for (const claim of claims) {
    const portable = claim.path.replace(/\\/g, "/");
    const portableNormalized = path.posix.normalize(portable);
    if (
      path.isAbsolute(claim.path) ||
      path.posix.isAbsolute(portable) ||
      path.win32.isAbsolute(claim.path)
    ) {
      throw new ConfigError(
        `Generated output path must be repository-relative: "${claim.path}"`
      );
    }
    if (portableNormalized === ".." || portableNormalized.startsWith("../")) {
      throw new ConfigError(
        `Generated output path escapes the repository: "${claim.path}"`
      );
    }

    const resolved = path.resolve(resolvedRoot, claim.path);
    assertPathContained(
      resolved,
      resolvedRoot,
      `Generated output path escapes the repository: "${claim.path}"`
    );

    // Never write through a symlink, even when it points back inside the
    // repository or is dangling. This prevents aliases to canonical sources,
    // other generated outputs, and not-yet-created external files.
    rejectSymlinkComponents(resolvedRoot, resolved, claim.path);

    claimTracker.claim(
      claim.path,
      claim.owner,
      (previousOwner) =>
        `Generated output path collision: ${previousOwner} and ${claim.owner} both claim "${claim.path}"`
    );

    const realExisting = realpathSync(nearestExistingPath(resolved));
    assertPathContained(
      realExisting,
      realRoot,
      `Generated output path escapes the repository through a symlink: "${claim.path}"`
    );
    resolvedByPath.set(claim.path, resolved);
  }

  return resolvedByPath;
}
