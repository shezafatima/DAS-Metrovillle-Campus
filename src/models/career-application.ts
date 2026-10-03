import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { softDeletePlugin, type SoftDeleteStatics } from "@/lib/soft-delete";

/**
 * Career application (012 careers) — data-model.md "CareerApplication".
 * Email and phone are NOT unique: the same person may apply again after the
 * reapply window (ADR-0008). The window is enforced in
 * src/lib/careers/mutations.ts, under per-identity locks, with non-unique
 * lookup indexes below.
 *
 * Not stored on purpose: the uploaded filename, the declared MIME type and
 * the visitor's IP.
 */
const careerApplicationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    qualification: { type: String, required: true, trim: true, maxlength: 150 },
    consentAt: { type: Date, required: true },
    cv: {
      // Random, unguessable key in the private document store; never returned to a browser.
      key: { type: String, required: true },
      size: { type: Number, required: true, min: 1 },
      // null = pending: the file is not yet confirmed in the store.
      storedAt: { type: Date, default: null },
      // Set once the stored object is confirmed deleted.
      removedAt: { type: Date, default: null },
    },
  },
  { timestamps: true, collection: "careerApplications" },
);

careerApplicationSchema.plugin(softDeletePlugin);

// Window lookup by identity (ADR-0008), newest first.
careerApplicationSchema.index({ email: 1, createdAt: -1 });
careerApplicationSchema.index({ phone: 1, createdAt: -1 });
// Admin list order and the retention sweep.
careerApplicationSchema.index({ createdAt: -1 });
// Pending clean-up.
careerApplicationSchema.index({ "cv.storedAt": 1, createdAt: 1 });

export type CareerApplicationDoc = InferSchemaType<typeof careerApplicationSchema> & {
  _id: mongoose.Types.ObjectId;
};

type CareerApplicationModel = Model<CareerApplicationDoc> & SoftDeleteStatics<CareerApplicationDoc>;

export const CareerApplication: CareerApplicationModel =
  (mongoose.models.CareerApplication as CareerApplicationModel | undefined) ??
  (mongoose.model<CareerApplicationDoc>("CareerApplication", careerApplicationSchema) as CareerApplicationModel);
