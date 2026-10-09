import mongoose from "mongoose";

/**
 * Seeding/reading helpers for the contact-messages (008) Playwright
 * specs. Inserts directly into the `messages` collection (bypassing the
 * app's mutation layer, same spirit as e2e/helpers/careers.ts) so specs
 * can set up exact fixtures without going through the public form first.
 */

export interface MessageSeed {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  body: string;
  status: "new" | "read" | "responded";
  createdAt: Date;
  statusChangedAt: Date | null;
  deletedAt: Date | null;
}

async function withConnection<T>(fn: () => Promise<T>): Promise<T> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("[e2e/helpers/messages] MONGODB_URI is not set — cannot seed messages");
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
 * Inserts messages with sensible defaults (status "new", no phone, not
 * deleted). `createdAt`/`updatedAt` default to "now minus the seed's
 * index in minutes" so insertion order is also newest-first order,
 * making list-ordering assertions predictable. Returns the inserted ids
 * in seed order.
 */
export async function seedMessages(seeds: Array<Partial<MessageSeed>>): Promise<string[]> {
  return withConnection(async () => {
    const now = new Date();
    const docs = seeds.map((seed, i) => ({
      name: seed.name ?? "Ali Khan",
      email: (seed.email ?? "ali@example.com").trim().toLowerCase(),
      phone: seed.phone ?? null,
      subject: seed.subject ?? "Enquiry",
      body: seed.body ?? "Seeded message body for end-to-end tests.",
      status: seed.status ?? "new",
      statusChangedAt: seed.statusChangedAt ?? null,
      deletedAt: seed.deletedAt ?? null,
      createdAt: seed.createdAt ?? new Date(now.getTime() - i * 60_000),
      updatedAt: now,
    }));
    const result = await mongoose.connection.db?.collection("messages").insertMany(docs);
    if (!result) throw new Error("[e2e/helpers/messages] insertMany returned no result");
    return docs.map((_, i) => result.insertedIds[i]!.toString());
  });
}

/** Reads raw `messages` documents, optionally filtered by email and/or including soft-deleted ones. */
export async function findMessages(
  options: { email?: string; withDeleted?: boolean } = {},
): Promise<Array<Record<string, unknown>>> {
  return withConnection(async () => {
    const filter: Record<string, unknown> = {};
    if (options.email) filter.email = options.email.trim().toLowerCase();
    if (!options.withDeleted) filter.deletedAt = null;
    const docs = await mongoose.connection.db?.collection("messages").find(filter).toArray();
    return docs ?? [];
  });
}

/** Removes every document from the `messages` collection. */
export async function clearMessages(): Promise<void> {
  await withConnection(async () => {
    await mongoose.connection.db?.collection("messages").deleteMany({});
  });
}

/** `X-Forwarded-For` header isolating a spec's rate-limit budget from every other spec. */
export function forwardedFor(n: number): Record<string, string> {
  return { "X-Forwarded-For": `203.0.113.${n}` };
}

export { loginAsAdmin } from "./news";
