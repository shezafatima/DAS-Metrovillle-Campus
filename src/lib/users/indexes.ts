import mongoose from "mongoose";
import { connectDb } from "@/lib/db";

let ensured: Promise<void> | null = null;

/**
 * The database-enforced "one account per email" rule (Constitution VI,
 * 011 FR-020). The seed script creates the same index, but this must not
 * depend on the seed having run: user creation calls it before its first
 * write, so a database the seed never touched (a fresh test database, a
 * restored copy) is still protected against concurrent duplicate creates.
 * `createIndex` is idempotent, so calling it again is harmless.
 */
export function ensureUserEmailIndex(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await connectDb();
      await mongoose.connection.db!.collection("user").createIndex({ email: 1 }, { unique: true });
    })().catch((err) => {
      // Don't cache a failure forever — the next create retries.
      ensured = null;
      throw err;
    });
  }
  return ensured;
}
