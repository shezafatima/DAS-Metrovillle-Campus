// @vitest-environment node
/**
 * Release step for 014 Settings by page (quickstart.md, "Release order"):
 * gives the Pages permission to every content manager who holds Settings, so
 * nobody loses what they can edit when Home, Resources and the Admission
 * messages move to Pages. Run it against the production database BEFORE
 * deploying 014 (no live code reads Pages yet, so it changes nobody's access
 * until the new build is live). Safe to run more than once.
 *
 * Usage:
 *   npm run grant:pages -- --dry-run   # lists the accounts it would change, writes nothing
 *   npm run grant:pages
 *
 * Both print the database host and name first, so you can confirm the target.
 */
import { loadEnvConfig } from "@next/env";
import path from "node:path";

loadEnvConfig(path.resolve(__dirname, ".."));

async function main(): Promise<void> {
  const dryRun = process.argv.slice(2).includes("--dry-run");
  const { connectDb } = await import("@/lib/db");
  const mongoose = (await import("mongoose")).default;

  try {
    await connectDb();
  } catch {
    console.log("Could not connect to the database");
    process.exit(1);
  }

  try {
    // Host and database name only: never the connection string or a password.
    const { host, name } = mongoose.connection;
    console.log(`Database: ${name} on ${host}${dryRun ? " (dry run: nothing will be written)" : ""}`);

    const { grantPagesToSettingsHolders } = await import("@/lib/users/grant-pages");
    const result = await grantPagesToSettingsHolders({ dryRun });
    for (const account of result.accounts) {
      console.log(`  ${account.email}  [${account.permissions.join(", ")}] + pages`);
    }
    console.log(dryRun ? `Would grant Pages to ${result.accounts.length} accounts` : `Pages granted to ${result.changed} accounts`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.log("Pages grant failed");
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
