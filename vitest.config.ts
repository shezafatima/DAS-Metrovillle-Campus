import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Default environment is jsdom for component tests. DB-backed,
    // route-handler, Server Action, and script test files opt into the
    // Node environment individually via a `// @vitest-environment node`
    // docblock at the top of the file (Vitest 5 removed
    // `environmentMatchGlobs`; this per-file docblock is the supported
    // replacement — see specs/002-foundation/research.md §11).
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
