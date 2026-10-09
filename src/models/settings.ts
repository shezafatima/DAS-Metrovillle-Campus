import mongoose, { Schema, type Model } from "mongoose";

/**
 * Settings (005) — one document per group, `_id` = the group key (`contact`,
 * `hero`, `stats`, `video`, `gallery`). Using the key as `_id` makes "one
 * record per group" (PRD §7) a database guarantee (Constitution VI) with no
 * extra index. A group with no document has never been saved and reads as
 * its definition defaults (`version` 0).
 *
 * `data` is validated by the group's Zod schema before every write
 * (src/lib/settings/schema.ts); Mongoose only stores it, so it is `Mixed`.
 * List items carry their own `deletedAt`, so the shared soft-delete plugin
 * (which filters whole documents) is deliberately not used here.
 *
 * `version` is the compare-and-set counter that makes a stale save fail
 * (src/lib/settings/mutations.ts).
 */
export interface SettingsDoc {
  _id: string;
  data: Record<string, unknown>;
  version: number;
  updatedBy: string;
  updatedAt: Date;
}

const settingsSchema = new Schema<SettingsDoc>(
  {
    _id: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    version: { type: Number, required: true, min: 1 },
    updatedBy: { type: String, required: true },
  },
  { collection: "settings", timestamps: { createdAt: false, updatedAt: true }, minimize: false },
);

export const Settings: Model<SettingsDoc> =
  (mongoose.models.Settings as Model<SettingsDoc> | undefined) ?? mongoose.model<SettingsDoc>("Settings", settingsSchema);
