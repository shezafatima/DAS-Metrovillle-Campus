/**
 * One-time retirement of the old signup data (012 US7, quickstart §4).
 * Drops the `signups` collection and unsets the legacy
 * `signupsLastOpenedAt` field on every admin notification state. Idempotent:
 * a second run finds nothing to do.
 *
 * Signups held personal data, so BACK UP the database first. The script
 * refuses to run without --confirm.
 *
 * Usage:
 *   npm run retire:signups                # shows what it would do, changes nothing
 *   npm run retire:signups -- --confirm   # does it
 */
import { loadEnvConfig } from "@next/env";
import path from "node:path";

loadEnvConfig(path.resolve(__dirname, ".."));

async function main(): Promise<void> {
  const confirm = process.argv.includes("--confirm");
  const { connectDb } = await import("@/lib/db");
  const mongoose = (await import("mongoose")).default;

  try {
    await connectDb();
  } catch {
    console.log("Could not connect to the database");
    process.exit(1);
  }

  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("No database connection");

    const exists = (await db.listCollections({ name: "signups" }, { nameOnly: true }).toArray()).length > 0;
    const count = exists ? await db.collection("signups").countDocuments({}) : 0;
    console.log(`The signups collection ${exists ? `exists and holds ${count} document(s)` : "does not exist"}.`);

    if (!confirm) {
      console.log("Refusing to change anything without --confirm. Back up the database first, then run again with --confirm.");
      process.exitCode = 1;
      return;
    }

    if (exists) {
      await db.collection("signups").drop();
      console.log("Dropped the signups collection.");
    }
    const result = await db
      .collection("adminNotificationStates")
      .updateMany({ signupsLastOpenedAt: { $exists: true } }, { $unset: { signupsLastOpenedAt: "" } });
    console.log(`Removed the old signups marker from ${result.modifiedCount} admin notification record(s).`);
    console.log("Signup data retired.");
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.log("Retiring signups failed");
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
