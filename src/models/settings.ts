import mongoose, { Schema, type Model } from "mongoose";

/**
 * Settings (005) — one document per group, `_id` = the group key (`contact`,
 * `hero`, `stats`, `video`, `admission`, `gallery`). Using the key as `_id` makes "one
 * record per group" (PRD §7) a database guarantee (Constitution VI) with no
 * extra index. A group with no document has never been saved and reads as
 * its definition defaults (`version` 0).
 *
 * `data` is validated by the group's Zod schema before every write
 * (src/lib/settings/schema.ts); Mongoose only stores it, so it is `Mixed`.
 * List items carry their own `deletedAt`, so the shared soft-delete plugin
 * (which filters whole documents) is deliberately not used here.
 *
 * `version` is the compare-and-set counter every write is conditional on
 * (src/lib/settings/mutations.ts). `panelSaves` (014, optional) records who
 * last saved each Settings panel and when; a record saved before 014 has
 * none, and readers fall back to `updatedBy` / `updatedAt`.
 *
 * `pendingConfirmation` (014b, optional) marks content copied from the reference
 * site by `seed:sections --confirm` as awaiting the client's confirmation. It
 * lives beside `data`, not in it, so it is in no panel fingerprint and never
 * bumps `version`: confirming never conflicts with an open editor. Only the
 * seed script sets it, and only the confirm actions clear it (ordinary saves
 * never touch it).
 */
export interface SettingsDoc {
  _id: string;
  data: Record<string, unknown>;
  version: number;
  updatedBy: string;
  updatedAt: Date;
  panelSaves?: Record<string, { by: string; at: Date }>;
  pendingConfirmation?: { source: string; seededAt: Date } | null;
}

const settingsSchema = new Schema<SettingsDoc>(
  {
    _id: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    version: { type: Number, required: true, min: 1 },
    updatedBy: { type: String, required: true },
    panelSaves: { type: Schema.Types.Mixed, required: false },
    pendingConfirmation: { type: Schema.Types.Mixed, required: false },
  },
  { collection: "settings", timestamps: { createdAt: false, updatedAt: true }, minimize: false },
);

export const Settings: Model<SettingsDoc> =
  (mongoose.models.Settings as Model<SettingsDoc> | undefined) ?? mongoose.model<SettingsDoc>("Settings", settingsSchema);
