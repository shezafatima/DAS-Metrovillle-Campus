/**
 * Runs the careers retention sweep once, without the hourly gate: removes
 * applications (and their CV files) past CAREERS_RETENTION_MONTHS, retries
 * failed file removals and clears abandoned uploads. Safe to run from a host
 * cron as often as wanted.
 *
 * Usage: npm run sweep:careers
 */
import { loadEnvConfig } from "@next/env";
import path from "node:path";

loadEnvConfig(path.resolve(__dirname, ".."));

async function main(): Promise<void> {
  const mongoose = (await import("mongoose")).default;
  try {
    const { sweepCareerApplications } = await import("@/lib/careers/retention");
    const counts = await sweepCareerApplications();
    console.log(
      `Careers sweep: ${counts.expired} expired, ${counts.retriedRemovals} file removals retried, ${counts.abandoned} abandoned uploads cleared`,
    );
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.log("Careers sweep failed");
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
