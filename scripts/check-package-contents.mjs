import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "packages", "agentquilt-cli");
const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: packageDir,
  encoding: "utf8",
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

let report;
try {
  report = JSON.parse(result.stdout)[0];
} catch (error) {
  console.error(`Unable to parse npm pack report: ${error.message}`);
  process.exit(1);
}

const packedFiles = new Set(report.files.map((file) => file.path));
const requiredFiles = [
  "dist/index.js",
  "dist/core/adapters/codex.js",
  "dist/core/pathSecurity.js",
  "package.json",
];
const missing = requiredFiles.filter((file) => !packedFiles.has(file));
if (missing.length > 0) {
  console.error(`Package is missing required files: ${missing.join(", ")}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(path.join(packageDir, "package.json"), "utf8"));
if (manifest.dependencies?.["smol-toml"] !== "1.7.0") {
  console.error("Package must declare the reviewed smol-toml 1.7.0 runtime dependency");
  process.exit(1);
}

console.log(
  `[OK] npm package contains ${report.entryCount} files, including the Codex adapter and reviewed TOML dependency.`
);
