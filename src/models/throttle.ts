import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * One generic fixed-window counter used by both the login lockout (US5)
 * and public-form rate limiting (US6) — see specs/002-foundation/data-model.md
 * "Throttle entry". Keys are namespaced by caller, e.g. "login:ip:1.2.3.4",
 * "login:email:admin@example.com", "form:contact:ip:1.2.3.4".
 */
const throttleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true, default: 0 },
    windowStart: { type: Date, required: true },
    blockedUntil: { type: Date, default: null },
    // TTL index: Mongo deletes the document once this time passes.
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false },
);

throttleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type ThrottleDoc = InferSchemaType<typeof throttleSchema>;

export const Throttle: Model<ThrottleDoc> =
  (models.Throttle as Model<ThrottleDoc> | undefined) ?? model<ThrottleDoc>("Throttle", throttleSchema);
