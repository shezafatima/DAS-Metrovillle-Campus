import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Admin notifications (009) — data-model.md "AdminNotificationState".
 * One document per admin, `_id` = the admin's Better Auth user id (a
 * string, not a generated ObjectId) — never soft-deleted, only
 * overwritten, so no plugin is applied here (unlike Message/CareerApplication).
 */
const adminNotificationStateSchema = new Schema(
  {
    _id: { type: String, required: true },
    // 012: the moment this admin last opened Applications (replaces the signups one).
    careersLastOpenedAt: { type: Date, required: true },
    // Legacy (004 signups): no longer read or written; unset by `npm run retire:signups` (012 US7).
    signupsLastOpenedAt: { type: Date },
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
