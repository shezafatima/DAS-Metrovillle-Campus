import mongoose from "mongoose";
import { E2E_ADMIN } from "../global-setup";

/**
 * Seeding/reading helpers for the admin-notifications (009) Playwright
 * specs. Inserts directly into `adminNotificationStates` and reads the
 * Better-Auth-owned `user` collection (read-only — app code never
 * writes to it, per 002's data model) so specs can seed a specific
 * "last opened Applications" moment without going through the UI first.
 */

async function withConnection<T>(fn: () => Promise<T>): Promise<T> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("[e2e/helpers/notifications] MONGODB_URI is not set — cannot seed notifications state");
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

/** Reads the seeded admin's Better Auth user id. */
export async function getAdminUserId(email: string = E2E_ADMIN.email): Promise<string> {
  return withConnection(async () => {
    const doc = await mongoose.connection.db?.collection("user").findOne({ email });
    if (!doc) throw new Error(`[e2e/helpers/notifications] no user found for ${email}`);
    return doc._id.toString();
  });
}

/** Upserts this admin's "last opened Applications" moment. */
export async function seedAdminNotificationState({
  adminId,
  careersLastOpenedAt,
}: {
  adminId: string;
  careersLastOpenedAt: Date;
}): Promise<void> {
  await withConnection(async () => {
    await mongoose.connection.db
      ?.collection("adminNotificationStates")
      .updateOne({ _id: adminId as unknown as string }, { $set: { careersLastOpenedAt } }, { upsert: true });
  });
}

/** Removes every document from the `adminNotificationStates` collection. */
export async function clearAdminNotificationStates(): Promise<void> {
  await withConnection(async () => {
    await mongoose.connection.db?.collection("adminNotificationStates").deleteMany({});
  });
}

export { loginAsAdmin } from "./news";
