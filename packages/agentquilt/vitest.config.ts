import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/index.ts",
        "src/commands/**",      // CLI handlers use process.exit — integration-tested, not unit-tested
        "src/schemas/lock.schema.ts", // Zod schema, exercised indirectly via lockWriter
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 65,
        statements: 75,
      },
      reporter: ["text", "lcov"],
    },
  },
});
