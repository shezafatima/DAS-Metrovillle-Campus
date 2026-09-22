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
    // Several [DB] test files across features share one collection in the
    // same external Atlas test database (e.g. 003 news: news-post,
    // admin-queries, mutations and public-queries all touch `news`).
    // Vitest's default file-level parallelism runs those files in separate
    // worker processes with no cross-file coordination, so one file's
    // describeWithDb beforeEach (a collection-wide deleteMany) can wipe
    // another file's just-seeded data mid-test — and running every file's
    // own connectDb() simultaneously can also exceed Atlas's connection
    // limits, timing out the beforeEach hook itself. Serializing file
    // execution trades suite speed for correctness — the same trade-off
    // playwright.config.ts already makes for the "admin" project sharing
    // one throttle collection.
    fileParallelism: false,
    // connectDb()'s own serverSelectionTimeoutMS is 15s; the default 10s
    // hook timeout was shorter than that and could kill a legitimately
    // slow (but eventually successful) connection attempt before Mongoose
    // finished trying.
    hookTimeout: 20000,
    // A [DB] test that makes several real network round-trips (e.g. the
    // login-lockout tests) can exceed the default 5s once file execution
    // is serialized (no other worker's traffic to overlap with, but also
    // no parallelism to hide per-call latency behind).
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
