import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated folders (all git-ignored): the Playwright dev build, reports and local data.
    ".next-e2e/**",
    "test-results/**",
    "playwright-report/**",
    "blob-report/**",
    "coverage/**",
    ".data/**",
  ]),
]);

export default eslintConfig;
