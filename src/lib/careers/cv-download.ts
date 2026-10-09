import { isValidObjectId } from "mongoose";
import { connectDb } from "@/lib/db";
import { CareerApplication } from "@/models/career-application";

export interface DownloadableCv {
  id: string;
  name: string;
  createdAt: Date;
  /** The storage key. Server-side only: never put it in a response body, a URL or a log. */
  key: string;
}

/**
 * The application whose CV an admin may download: stored (not pending) and
 * not deleted (the soft-delete plugin already excludes deleted ones).
 * `null` for a malformed id, an unknown one, a pending one and a deleted
 * one alike, so the route answers all four with the same 404.
 */
export async function findDownloadableCv(id: string): Promise<DownloadableCv | null> {
  if (!/^[a-f0-9]{24}$/i.test(id) || !isValidObjectId(id)) return null;
  await connectDb();
  const doc = await CareerApplication.findOne({ _id: id, "cv.storedAt": { $ne: null } })
    .select({ name: 1, createdAt: 1, "cv.key": 1 })
    .lean();
  if (!doc?.cv?.key) return null;
  return { id: doc._id.toString(), name: doc.name, createdAt: doc.createdAt, key: doc.cv.key };
}
