import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.e2e.test.ts"],
    setupFiles: ["tests/e2e/setup.ts"],
    environment: "node",
    fileParallelism: false,
  },
});
