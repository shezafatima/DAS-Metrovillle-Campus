// @vitest-environment node
/**
 * Release step for 007 Gallery Albums: moves the 005 flat photo gallery into
 * albums ("Gallery", "Gallery 2" … 8 photos each, at most 6 albums) and
 * reports how many photos, if any, were not migrated (only photos past the
 * 48th). Safe to run more than once. The site also runs the same migration
 * lazily on first read, so a forgotten run loses nothing, but only this
 * command prints the report.
 *
 * Usage:
 *   npm run migrate:gallery
 */
import { loadEnvConfig } from "@next/env";
import path from "node:path";

loadEnvConfig(path.resolve(__dirname, ".."));

async function main(): Promise<void> {
  const { connectDb } = await import("@/lib/db");
  const mongoose = (await import("mongoose")).default;

  try {
    await connectDb();
  } catch {
    console.log("Could not connect to the database");
    process.exit(1);
  }

  try {
    const { runGalleryMigration } = await import("@/lib/gallery/migrate-cli");
    console.log(await runGalleryMigration());
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.log("Gallery migration failed");
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
