// @vitest-environment node
import { afterAll, beforeEach, describe } from "vitest";
import mongoose from "mongoose";

/**
 * Wraps a DB-backed test suite so it only runs when MONGODB_URI is set,
 * always against a dedicated test database (never the dev/prod one),
 * and drops the named collections before each test so tests don't leak
 * state into each other. On a machine with no MongoDB configured, the
 * suite is skipped with a visible notice instead of failing (research.md
 * §11) so `npm test` stays green without a database available.
 *
 * Connects through the same `connectDb()` the application code uses, so
 * tests and the code under test share one cached connection rather than
 * racing two independent `mongoose.connect()` calls.
 */
export function describeWithDb(
  name: string,
  collectionsToClear: string[],
  fn: () => void,
): void {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn(`[db tests skipped] MONGODB_URI not set — skipping "${name}"`);
    describe.skip(name, fn);
    return;
  }

  process.env.MONGODB_DB_NAME = "dar_e_arqam_test";

  describe(name, () => {
    beforeEach(async () => {
      const { connectDb } = await import("@/lib/db");
      await connectDb();
      for (const collectionName of collectionsToClear) {
        try {
          await mongoose.connection.db?.collection(collectionName).deleteMany({});
        } catch {
          // Collection doesn't exist yet — nothing to clear.
        }
      }
    });

    afterAll(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    });

    fn();
  });
}
