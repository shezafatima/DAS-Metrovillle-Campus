/**
 * Release gate (012, Constitution V): a production build must not ship
 * while the careers privacy notice is still placeholder wording or the
 * retention period was never chosen. Runs as `prebuild`.
 *
 * Only `VERCEL_ENV=production` fails; every other environment (local,
 * preview) prints a warning and passes, so day-to-day builds are never
 * blocked.
 *
 * It also blocks while stock-photo hosts are still allowed in next.config.ts
 * (TEMPORARY_IMAGE_HOSTS, 017).
 *
 * 013 adds the student registration privacy notice and REGISTRATION_RETENTION_MONTHS to the same gate.
 *
 * To clear the careers items: set `careersCopy.privacy.placeholder` to `false` in
 * src/content/careers.ts once the client has approved the notice, and set
 * CAREERS_RETENTION_MONTHS in the production environment to the period the
 * client agreed. The registration items clear the same way:
 * `registrationCopy.privacy.placeholder` in src/content/registration.ts and
 * REGISTRATION_RETENTION_MONTHS.
 */
import { loadEnvConfig } from "@next/env";
import path from "node:path";

export interface ReleaseContentInput {
  vercelEnv: string | undefined;
  privacyPlaceholder: boolean;
  retentionMonths: string | undefined;
  /** 013: the student registration privacy notice is still pending client approval. */
  registrationPrivacyPlaceholder: boolean;
  registrationRetentionMonths: string | undefined;
  /** Stock-photo hosts still allowed in next.config.ts (017). Defaults to none. */
  temporaryImageHosts?: string[];
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
  if (input.registrationPrivacyPlaceholder) {
    problems.push(
      "The student registration privacy notice is still pending client approval (registrationCopy.privacy.placeholder is true in src/content/registration.ts). Get the client's approved text, then set it to false.",
    );
  }
  if (!input.registrationRetentionMonths?.trim()) {
    problems.push(
      "REGISTRATION_RETENTION_MONTHS is not set. Set it explicitly to the retention period the client agreed (1 to 120 months); the built-in 12 is not a client-agreed value.",
    );
  }
  if (input.temporaryImageHosts?.length) {
    problems.push(
      `Stock photos are still allowed in next.config.ts (${input.temporaryImageHosts.join(", ")}). Get a real photo for Our Story from the client, upload it, set it in src/content/about/our-story.ts, then empty TEMPORARY_IMAGE_HOSTS in src/lib/temporary-image-hosts.ts.`,
    );
  }
  return { ok: problems.length === 0, problems, blocking: input.vercelEnv === "production" && problems.length > 0 };
}

async function main(): Promise<void> {
  loadEnvConfig(path.resolve(__dirname, ".."));
  const { careersCopy } = await import("@/content/careers");
  const { registrationCopy } = await import("@/content/registration");
  const { TEMPORARY_IMAGE_HOSTS } = await import("@/lib/temporary-image-hosts");
  const result = checkReleaseContent({
    vercelEnv: process.env.VERCEL_ENV,
    privacyPlaceholder: careersCopy.privacy.placeholder,
    retentionMonths: process.env.CAREERS_RETENTION_MONTHS,
    registrationPrivacyPlaceholder: registrationCopy.privacy.placeholder,
    registrationRetentionMonths: process.env.REGISTRATION_RETENTION_MONTHS,
    temporaryImageHosts: TEMPORARY_IMAGE_HOSTS,
  });

  if (result.ok) return;
  const label = result.blocking ? "Release blocked" : "Release content warning (does not block this build)";
  console.error(`${label}:\n${result.problems.map((problem) => `  - ${problem}`).join("\n")}`);
  if (result.blocking) process.exit(1);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/check-release-content.ts")) {
  main();
}
