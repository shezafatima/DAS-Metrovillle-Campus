import mongoose from "mongoose";

/**
 * Seeding/reading helpers for the signup (004) Playwright specs.
 * Inserts directly into the `signups` collection (bypassing the app's
 * mutation layer, same spirit as e2e/helpers/news.ts) so specs can set
 * up exact fixtures — including states the UI itself would never
 * produce on its own, like a soft-deleted record or a specific
 * `firstSignupAt` — without going through the form first.
 */

export interface SignupSeed {
  name: string;
  email: string;
  phone: string; // canonical E.164, e.g. "+923001234567"
  sources: Array<"home" | "resources">;
  firstSignupAt: Date;
  lastSignupAt: Date;
  deletedAt: Date | null;
}

async function withConnection<T>(fn: () => Promise<T>): Promise<T> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("[e2e/helpers/signups] MONGODB_URI is not set — cannot seed signups");
  const wasConnected = mongoose.connection.readyState !== 0;
  if (!wasConnected) {
    await mongoose.connect(uri, { dbName: "dar_e_arqam_test", serverSelectionTimeoutMS: 15000 });
  }
  try {
    return await fn();
  } finally {
    if (!wasConnected) {
      await mongoose.disconnect().catch(() => {});
    }
  }
}

/**
 * Inserts signups with sensible defaults (source "home", first/latest
 * signup "now", not deleted) so a test only spells out the fields it
 * cares about. Returns the seeded documents (including generated
 * `_id`s) in insertion order.
 */
export async function seedSignups(
  seeds: Array<Partial<SignupSeed> & { name: string; email: string; phone: string }>,
): Promise<Array<SignupSeed & { _id: mongoose.Types.ObjectId }>> {
  return withConnection(async () => {
    const now = new Date();
    const docs = seeds.map((seed) => ({
      name: seed.name,
      email: seed.email.trim().toLowerCase(),
      phone: seed.phone,
      sources: seed.sources ?? ["home"],
      firstSignupAt: seed.firstSignupAt ?? now,
      lastSignupAt: seed.lastSignupAt ?? now,
      deletedAt: seed.deletedAt ?? null,
      createdAt: now,
      updatedAt: now,
    }));
    const result = await mongoose.connection.db?.collection("signups").insertMany(docs);
    if (!result) throw new Error("[e2e/helpers/signups] insertMany returned no result");
    return docs.map((doc, i) => ({ ...doc, _id: result.insertedIds[i]! }) as SignupSeed & {
      _id: mongoose.Types.ObjectId;
    });
  });
}

/**
 * Reads one signup by email (lower-cased/trimmed to match the stored
 * form). `withDeleted: true` bypasses the plugin's default filter so a
 * test can see a soft-deleted record directly in the collection.
 */
export async function findSignupByEmail(
  email: string,
  options: { withDeleted?: boolean } = {},
): Promise<(SignupSeed & { _id: mongoose.Types.ObjectId }) | null> {
  return withConnection(async () => {
    const filter: Record<string, unknown> = { email: email.trim().toLowerCase() };
    if (!options.withDeleted) filter.deletedAt = null;
    const doc = await mongoose.connection.db?.collection("signups").findOne(filter);
    return (doc as (SignupSeed & { _id: mongoose.Types.ObjectId }) | null | undefined) ?? null;
  });
}

/**
 * Bumps one signup's `lastSignupAt` in place — simulates the "repeat
 * submission" upsert (004/ADR-0001) without going through the public
 * form, for specs that need to prove a record counts as new again
 * (009's "what counts as new" story).
 */
export async function touchSignupLastSignupAt(id: mongoose.Types.ObjectId, lastSignupAt: Date): Promise<void> {
  await withConnection(async () => {
    await mongoose.connection.db?.collection("signups").updateOne({ _id: id }, { $set: { lastSignupAt } });
  });
}

/** Removes every document from the `signups` collection. */
export async function clearSignups(): Promise<void> {
  await withConnection(async () => {
    await mongoose.connection.db?.collection("signups").deleteMany({});
  });
}

export { loginAsAdmin } from "./news";
