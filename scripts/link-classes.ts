// @vitest-environment node
/**
 * The class-link migration (014b, spec FR-036; contracts/scripts.md). Links the
 * typed class names in "Classes open for admission" to the Class Levels rows
 * with the same name (ignoring case and extra spaces). It is optional: until it
 * runs, every typed name reads as "not linked" and is still offered in the
 * registration form. Nothing is dropped; names that match no level stay "not
 * linked" and are reported (and listed in the Admission tab).
 *
 * Run by hand only, never from build, deploy or startup.
 *
 * Usage:
 *   npm run migrate:class-levels              # dry run: reports what would be linked, writes nothing
 *   npm run migrate:class-levels -- --confirm # writes
 *
 * Both print the database host and name first, so you can confirm the target.
 * Safe to run more than once.
 */
import { loadEnvConfig } from "@next/env";
import path from "node:path";

loadEnvConfig(path.resolve(__dirname, ".."));

async function main(): Promise<void> {
  const confirm = process.argv.slice(2).includes("--confirm");
  const { connectDb } = await import("@/lib/db");
  const mongoose = (await import("mongoose")).default;

  try {
    await connectDb();
  } catch {
    console.log("Could not connect to the database");
    process.exit(1);
  }

  let exitCode = 0;
  try {
    // Host and database name only: never the connection string or a password.
    const { host, name } = mongoose.connection;
    console.log(`Database: ${name} on ${host}${confirm ? "" : " (dry run: nothing will be written)"}`);

    const { linkClasses } = await import("@/lib/settings/link-classes");
    const report = await linkClasses({ confirm });

    if (report.linked.length === 0 && report.unmatched.length === 0 && report.duplicates.length === 0) {
      console.log("Nothing to link.");
    } else {
      const verb = confirm ? "Linked" : "Would link";
      for (const entry of report.linked) console.log(`  ${verb}: ${entry.typed} -> ${entry.level.name} (${entry.level.id})`);
      for (const entry of report.unmatched) console.log(`  Not linked: ${entry.typed}`);
      for (const entry of report.duplicates) console.log(`  Duplicate: ${entry.typed} (${entry.level.name} is already ticked by another item)`);
      console.log(`${report.linked.length} to link, ${report.unmatched.length} not linked, ${report.duplicates.length} duplicates`);
    }

    if (report.outcome === "gave_up") {
      console.log("Admission settings keep changing; nothing written. Run again.");
      exitCode = 1;
    } else if (report.outcome === "dry_run") {
      console.log("Dry run: nothing written. Add --confirm to write.");
    } else if (report.outcome === "written") {
      console.log("Written.");
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.log("Class link migration failed");
    exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
  process.exit(exitCode);
}

main();
