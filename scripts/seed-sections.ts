// @vitest-environment node
/**
 * The one-time seed of the admin-managed sections (014b, spec FR-050–FR-052;
 * contracts/scripts.md): copies the reference site's Syllabi, Examination text
 * or Portal links into Settings, marked "pending client confirmation".
 *
 * Run by hand only, never from build, deploy or startup. It never overwrites:
 * if the section already has any content it refuses (exit 1), with or without
 * --confirm. The data is typed in src/content/seed/ (reviewable in a diff).
 *
 * Usage:
 *   npm run seed:sections -- syllabi             # dry run: what would be written, nothing written
 *   npm run seed:sections -- syllabi --confirm   # writes
 *   (sections: syllabi, examination, portal-links)
 *
 * Both print the database host and name first, so you can confirm the target.
 */
import { loadEnvConfig } from "@next/env";
import path from "node:path";

loadEnvConfig(path.resolve(__dirname, ".."));

const USAGE = "Usage: npm run seed:sections -- <syllabi|examination|portal-links> [--confirm]";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const confirm = args.includes("--confirm");
  const section = args.find((arg) => !arg.startsWith("--"));
  const { SEED_SECTIONS, isSeedSection, seedSection } = await import("@/lib/settings/seed");
  if (!isSeedSection(section)) {
    console.log(USAGE);
    console.log(`Sections: ${SEED_SECTIONS.join(", ")}`);
    process.exit(2);
  }

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

    const report = await seedSection(section, { confirm });
    console.log(`${report.label}, from ${report.source}`);

    if (report.outcome === "invalid") {
      console.log("The seed data does not pass the group's own validation (a bug in the data file). Nothing written:");
      for (const [field, message] of Object.entries(report.errors ?? {})) console.log(`  ${field}: ${message}`);
      process.exit(1);
    }
    if (report.outcome === "refused_existing") {
      console.log(`${report.label} already has content; nothing written.`);
      process.exit(1);
    }

    console.log(`Counts: ${Object.entries(report.counts).map(([key, value]) => `${key} ${value}`).join(", ")}`);
    for (const line of report.lines) console.log(`  ${line}`);
    if (report.insecure.length > 0) {
      console.log("Plain http:// addresses (the panel will show the not-secure warning):");
      for (const line of report.insecure) console.log(`  ${line}`);
    }
    console.log("Adaptations to fit the group's shape:");
    for (const line of report.adaptations) console.log(`  - ${line}`);

    if (report.outcome === "gave_up") {
      console.log("Changed while seeding; nothing written. Run again.");
      exitCode = 1;
    } else if (report.outcome === "dry_run") {
      console.log("Dry run: nothing written. Add --confirm to write.");
    } else {
      console.log("Written. It shows on the public site within a minute. The panel says it is pending client confirmation.");
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.log("Seed failed");
    exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
  process.exit(exitCode);
}

main();
