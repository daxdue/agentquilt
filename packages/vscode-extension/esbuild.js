const esbuild = require("esbuild");

const watch = process.argv.includes("--watch");

async function build() {
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    outfile: "dist/extension.js",
    platform: "node",
    format: "cjs",
    target: "node18",
    external: ["vscode"],
    sourcemap: true,
    minify: !watch,
  });

  if (watch) {
    await ctx.watch();
    console.log("watching for changes...");
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
