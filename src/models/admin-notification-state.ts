import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Admin notifications (009) — data-model.md "AdminNotificationState".
 * One document per admin, `_id` = the admin's Better Auth user id (a
 * string, not a generated ObjectId) — never soft-deleted, only
 * overwritten, so no plugin is applied here (unlike Message/Signup).
 */
const adminNotificationStateSchema = new Schema(
  {
    _id: { type: String, required: true },
    signupsLastOpenedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "adminNotificationStates" },
);

export type AdminNotificationStateDoc = InferSchemaType<typeof adminNotificationStateSchema> & {
  _id: string;
};

type AdminNotificationStateModel = Model<AdminNotificationStateDoc>;

export const AdminNotificationState: AdminNotificationStateModel =
  (mongoose.models.AdminNotificationState as AdminNotificationStateModel | undefined) ??
  (mongoose.model<AdminNotificationStateDoc>("AdminNotificationState", adminNotificationStateSchema) as AdminNotificationStateModel);
