import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * One record per registrations CSV export (013, research §11): who, when and
 * how many rows. Holds no registration content and never the search text (it
 * may be a child's name). Removed by the retention sweep; no soft delete.
 */
const registrationExportSchema = new Schema(
  {
    at: { type: Date, required: true, index: true },
    byUserId: { type: String, required: true },
    byEmail: { type: String, required: true },
    rows: { type: Number, required: true, min: 0 },
    classFilter: { type: String, default: null },
    searched: { type: Boolean, required: true },
  },
  { collection: "registrationExports" },
);

export type RegistrationExportDoc = InferSchemaType<typeof registrationExportSchema> & {
  _id: mongoose.Types.ObjectId;
};

type RegistrationExportModel = Model<RegistrationExportDoc>;

export const RegistrationExport: RegistrationExportModel =
  (mongoose.models.RegistrationExport as RegistrationExportModel | undefined) ??
  (mongoose.model<RegistrationExportDoc>("RegistrationExport", registrationExportSchema) as RegistrationExportModel);
