/**
 * Release step for 022 (registration form): the form's emergency name and phone became one
 * "Emergency contact number". This moves each existing record's phone to the new field and keeps
 * its old name in the record (not shown on the form).
 *
 * Dry run by default: it only reports how many records it would change. Writes only with --confirm.
 * Safe to run more than once.
 *
 * Usage:
 *   npm run migrate:emergency-contact
 *   npm run migrate:emergency-contact -- --confirm
 */
import { loadEnvConfig } from "@next/env";
import path from "node:path";

loadEnvConfig(path.resolve(__dirname, ".."));

async function main(): Promise<void> {
  const mongoose = (await import("mongoose")).default;
  try {
    const { formatEmergencyMigrationReport, migrateEmergencyContacts } = await import("@/lib/registration/migrate-emergency-contact");
    const result = await migrateEmergencyContacts({ confirm: process.argv.includes("--confirm") });
    console.log(formatEmergencyMigrationReport(result));
  } catch {
    // Never print the error: a database error can echo stored values.
    console.error("Emergency contact migration failed");
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
