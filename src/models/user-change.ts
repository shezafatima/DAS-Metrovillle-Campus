import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * The record of account and permission changes (011, data-model.md
 * "UserChange" → `userChanges`; Constitution III). Append-only on purpose:
 * no soft-delete plugin and no update or delete path in code — an entry
 * says who did what to whom and when, and it must stay true (FR-031).
 * Emails are snapshots, so an entry stays readable after an account is
 * deleted or its email reused. Nothing here can hold a password: the
 * `details` shapes are fixed per type in src/lib/users/mutations.ts.
 */
export const USER_CHANGE_TYPES = [
  "created",
  "role_changed",
  "permissions_changed",
  "disabled",
  "enabled",
  "password_set",
  "deleted",
] as const;

export type UserChangeType = (typeof USER_CHANGE_TYPES)[number];

const userChangeSchema = new Schema(
  {
    at: { type: Date, required: true, default: () => new Date() },
    actorId: { type: String, required: true },
    actorEmail: { type: String, required: true },
    targetId: { type: String, required: true },
    targetEmail: { type: String, required: true },
    type: { type: String, enum: USER_CHANGE_TYPES, required: true },
    details: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: false, collection: "userChanges" },
);

userChangeSchema.index({ at: -1 });

export type UserChangeDoc = InferSchemaType<typeof userChangeSchema> & {
  _id: mongoose.Types.ObjectId;
};

type UserChangeModel = Model<UserChangeDoc>;

export const UserChange: UserChangeModel =
  (mongoose.models.UserChange as UserChangeModel | undefined) ??
  (mongoose.model<UserChangeDoc>("UserChange", userChangeSchema) as UserChangeModel);
