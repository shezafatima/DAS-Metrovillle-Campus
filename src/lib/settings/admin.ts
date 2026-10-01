import { connectDb } from "@/lib/db";
import { Settings } from "@/models/settings";
import { defaultsFor, mergeWithDefaults } from "./defaults";
import { toLiveValue } from "./items";
import { GROUPS } from "./registry";
import type { GroupKey, GroupValue } from "./types";

export interface AdminSettings {
  /** List items are live only, without the `deletedAt` marker. */
  data: GroupValue;
  /** 0 when the group has never been saved (the form shows the starting values). */
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

/**
 * What the admin form loads for one group. Callers must have passed
 * `requireAdminPage("settings")` first. A group that was never saved (or has
 * gained fields since it was saved) is filled from the definition defaults.
 */
export async function getAdminSettings(group: GroupKey): Promise<AdminSettings> {
  const def = GROUPS[group];
  await connectDb();
  const doc = await Settings.findById(group).lean();
  if (!doc) return { data: defaultsFor(def), version: 0, updatedAt: null, updatedBy: null };
  return {
    data: toLiveValue(def, mergeWithDefaults(def, doc.data)),
    version: doc.version,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    updatedBy: doc.updatedBy ?? null,
  };
}
