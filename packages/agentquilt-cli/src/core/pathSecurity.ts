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

export interface OutputPathClaim {
  path: string;
  owner: string;
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
  const ownersByKey = new Map<string, string>();
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

    const key = portablePathKey(claim.path);
    const previousOwner = ownersByKey.get(key);
    if (previousOwner !== undefined) {
      throw new ConfigError(
        `Generated output path collision: ${previousOwner} and ${claim.owner} both claim "${claim.path}"`
      );
    }
    ownersByKey.set(key, claim.owner);

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
