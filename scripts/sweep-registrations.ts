/**
 * Runs the registrations retention sweep once, without the hourly gate:
 * removes registrations past REGISTRATION_RETENTION_MONTHS, registrations
 * deleted more than 30 days ago, and old export records. Safe to run from a
 * host cron as often as wanted.
 *
 * Usage: npm run sweep:registrations
 */
import { loadEnvConfig } from "@next/env";
import path from "node:path";

loadEnvConfig(path.resolve(__dirname, ".."));

async function main(): Promise<void> {
  const mongoose = (await import("mongoose")).default;
  try {
    const { sweepRegistrations } = await import("@/lib/registration/retention");
    const counts = await sweepRegistrations();
    console.log(
      `Registrations sweep: ${counts.expired} past retention, ${counts.graceEnded} past the 30-day restore period, ${counts.exports} old export records removed`,
    );
  } catch {
    // Never print the error: a database error can echo stored values.
    console.error("Registrations sweep failed");
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
