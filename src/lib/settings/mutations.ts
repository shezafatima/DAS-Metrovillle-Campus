import { settingsCopy } from "@/content/admin";
import { deleteUploadedImage, verifyUploadedImage } from "@/lib/cloudinary";
import { connectDb } from "@/lib/db";
import { Settings } from "@/models/settings";
import { reconcileGroupValue, toLiveValue } from "./items";
import { GROUPS } from "./registry";
import { collectImages, parseGroup } from "./schema";
import type { GroupKey, GroupValue } from "./types";

export interface SaveGroupInput {
  group: GroupKey;
  /** 0 = the group has never been saved; otherwise the version the form was loaded with. */
  expectedVersion: number;
  data: unknown;
  /** The saving admin's email, taken from the session by the caller, never from the request. */
  actorEmail: string;
}

export type SaveGroupResult =
  | { ok: true; version: number; data: GroupValue; savedAt: string }
  | { ok: false; error: "invalid"; fields: Record<string, string> }
  | { ok: false; error: "image_rejected"; fields: Record<string, string> }
  | { ok: false; error: "conflict" }
  | { ok: false; error: "unavailable" };

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
}

/**
 * Saves one settings group (005, research R2/R3, contracts/settings-actions.md):
 * validate with the group's own schema, reconcile list items (soft delete),
 * re-verify every image that is new since the stored version, then write with
 * a version compare-and-set. It stores the whole group or nothing, and a save
 * that lost a race is a conflict, never a mixture of two saves.
 *
 * No transactions are assumed: the only write is one insert (first save,
 * guarded by the `_id` unique key) or one `findOneAndUpdate` filtered on the
 * version the admin loaded.
 */
export async function saveGroup(input: SaveGroupInput): Promise<SaveGroupResult> {
  const def = GROUPS[input.group];

  const parsed = parseGroup(def, input.data);
  if (!parsed.ok) return { ok: false, error: "invalid", fields: parsed.fields };

  try {
    await connectDb();
    const stored = await Settings.findById(input.group).lean();
    const storedVersion = stored?.version ?? 0;
    if (storedVersion !== input.expectedVersion) return { ok: false, error: "conflict" };

    const now = new Date();
    const reconciled = reconcileGroupValue(def, stored?.data ?? null, parsed.data, now);
    if (!reconciled.ok) {
      return { ok: false, error: "invalid", fields: { [reconciled.field]: settingsCopy.errors.unknownItem } };
    }

    // Only images this save introduces are checked; ones already stored were checked when they were saved.
    const alreadyStored = new Set(collectImages(def, stored?.data).map((image) => image.publicId));
    for (const image of collectImages(def, parsed.data)) {
      if (alreadyStored.has(image.publicId)) continue;
      const verdict = await verifyUploadedImage(image.publicId, image.folder);
      if (verdict.ok) continue;
      if (verdict.reason === "unavailable") return { ok: false, error: "unavailable" };
      await deleteUploadedImage(image.publicId);
      return { ok: false, error: "image_rejected", fields: { [image.path]: settingsCopy.errors.imageLimits } };
    }

    let version: number;
    if (input.expectedVersion === 0) {
      try {
        await Settings.create({ _id: input.group, data: reconciled.data, version: 1, updatedBy: input.actorEmail });
      } catch (error) {
        if (isDuplicateKey(error)) return { ok: false, error: "conflict" };
        throw error;
      }
      version = 1;
    } else {
      const updated = await Settings.findOneAndUpdate(
        { _id: input.group, version: input.expectedVersion },
        { $set: { data: reconciled.data, updatedBy: input.actorEmail }, $inc: { version: 1 } },
        { returnDocument: "after" },
      ).lean();
      if (!updated) return { ok: false, error: "conflict" };
      version = updated.version;
    }

    return { ok: true, version, data: toLiveValue(def, reconciled.data), savedAt: now.toISOString() };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
