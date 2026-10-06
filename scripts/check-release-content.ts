/**
 * Release gate (012, Constitution V): a production build must not ship
 * while the careers privacy notice is still placeholder wording or the
 * retention period was never chosen. Runs as `prebuild`.
 *
 * Only `VERCEL_ENV=production` fails; every other environment (local,
 * preview) prints a warning and passes, so day-to-day builds are never
 * blocked.
 *
 * To clear it: set `careersCopy.privacy.placeholder` to `false` in
 * src/content/careers.ts once the client has approved the notice, and set
 * CAREERS_RETENTION_MONTHS in the production environment to the period the
 * client agreed.
 */
import { loadEnvConfig } from "@next/env";
import path from "node:path";

export interface ReleaseContentInput {
  vercelEnv: string | undefined;
  privacyPlaceholder: boolean;
  retentionMonths: string | undefined;
}

export interface ReleaseContentResult {
  ok: boolean;
  /** What is unresolved, one line each. */
  problems: string[];
  /** True when the problems block the build (production only). */
  blocking: boolean;
}

export function checkReleaseContent(input: ReleaseContentInput): ReleaseContentResult {
  const problems: string[] = [];
  if (input.privacyPlaceholder) {
    problems.push(
      "The careers privacy notice is still placeholder wording (careersCopy.privacy.placeholder is true in src/content/careers.ts). Get the client's approved text, then set it to false.",
    );
  }
  if (!input.retentionMonths?.trim()) {
    problems.push(
      "CAREERS_RETENTION_MONTHS is not set. Set it explicitly to the retention period the client agreed (1 to 120 months); the built-in 12 is not a client-agreed value.",
    );
  }
  return { ok: problems.length === 0, problems, blocking: input.vercelEnv === "production" && problems.length > 0 };
}

async function main(): Promise<void> {
  loadEnvConfig(path.resolve(__dirname, ".."));
  const { careersCopy } = await import("@/content/careers");
  const result = checkReleaseContent({
    vercelEnv: process.env.VERCEL_ENV,
    privacyPlaceholder: careersCopy.privacy.placeholder,
    retentionMonths: process.env.CAREERS_RETENTION_MONTHS,
  });

  if (result.ok) return;
  const label = result.blocking ? "Release blocked" : "Release content warning (does not block this build)";
  console.error(`${label}:\n${result.problems.map((problem) => `  - ${problem}`).join("\n")}`);
  if (result.blocking) process.exit(1);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/check-release-content.ts")) {
  main();
}
