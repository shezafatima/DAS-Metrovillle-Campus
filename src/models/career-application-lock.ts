import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Short-lived per-identity locks (ADR-0008). `_id` is
 * `"email:" + sha256(email)` or `"phone:" + sha256(phone)`, so the collection
 * holds no personal data, and the unique `_id` is what makes the lock
 * exclusive. The TTL index only garbage-collects: an expired lease is taken
 * over directly, so correctness never waits for the TTL monitor.
 */
const careerApplicationLockSchema = new Schema(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: "careerApplicationLocks", versionKey: false },
);

careerApplicationLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type CareerApplicationLockDoc = InferSchemaType<typeof careerApplicationLockSchema> & { _id: string };

type CareerApplicationLockModel = Model<CareerApplicationLockDoc>;

export const CareerApplicationLock: CareerApplicationLockModel =
  (mongoose.models.CareerApplicationLock as CareerApplicationLockModel | undefined) ??
  (mongoose.model<CareerApplicationLockDoc>("CareerApplicationLock", careerApplicationLockSchema) as CareerApplicationLockModel);
