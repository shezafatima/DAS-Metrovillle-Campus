import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * The record of items removed by a Settings save (014b, spec FR-007, research
 * R3, data-model.md "Settings change record" → `settingsChanges`). There is no
 * permanent-delete action: removing an item is part of a normal panel save,
 * and this entry keeps the removed item's full previous value so a wrong
 * removal can be re-entered by hand (quickstart "Recovering a removed item").
 *
 * Append-only on purpose, like `userChanges`: no soft-delete plugin and no
 * update or delete path in code. Kept indefinitely: it holds public school
 * content and the saving admin's email, nothing else personal. Written only
 * when a save removed something, never for edits or reordering.
 */
const settingsChangeSchema = new Schema(
  {
    group: { type: String, required: true },
    panel: { type: String, required: true },
    actorEmail: { type: String, required: true },
    at: { type: Date, required: true, default: () => new Date() },
    removed: {
      type: [
        new Schema(
          {
            path: { type: String, required: true },
            label: { type: String, required: true },
            value: { type: Schema.Types.Mixed, required: true },
          },
          { _id: false, minimize: false },
        ),
      ],
      required: true,
      validate: { validator: (value: unknown[]) => value.length > 0, message: "removed must not be empty" },
    },
  },
  { timestamps: false, collection: "settingsChanges", minimize: false },
);

settingsChangeSchema.index({ group: 1, at: -1 });

export type SettingsChangeDoc = InferSchemaType<typeof settingsChangeSchema> & {
  _id: mongoose.Types.ObjectId;
};

type SettingsChangeModel = Model<SettingsChangeDoc>;

export const SettingsChange: SettingsChangeModel =
  (mongoose.models.SettingsChange as SettingsChangeModel | undefined) ??
  (mongoose.model<SettingsChangeDoc>("SettingsChange", settingsChangeSchema) as SettingsChangeModel);
