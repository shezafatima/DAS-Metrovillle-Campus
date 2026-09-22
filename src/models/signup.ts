import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { softDeletePlugin, type SoftDeleteStatics } from "@/lib/soft-delete";
import { SIGNUP_SOURCE_KEYS } from "@/lib/signup/sources";

/**
 * Signup (004 signup) — data-model.md "Signup → `signups`". One record
 * per person: the natural key is `email` (unique, no partial filter —
 * a soft-deleted record's email stays reserved, so a re-signup
 * restores it rather than creating a second record). See ADR-0001 for
 * the full rationale, including why this rule does NOT extend to
 * contact messages (008), which are append-only.
 */
const signupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    sources: { type: [{ type: String, enum: SIGNUP_SOURCE_KEYS }], required: true },
    firstSignupAt: { type: Date, required: true },
    lastSignupAt: { type: Date, required: true },
  },
  // Explicit collection name: "signups", not Mongoose's auto-pluralized
  // "signups" would already match here, but named explicitly for
  // clarity and to match e2e/helpers/signups.ts's direct writes.
  { timestamps: true, collection: "signups" },
);

signupSchema.plugin(softDeletePlugin);

// Admin list default order (lastSignupAt desc) with the plugin's
// deletedAt:null filter applied automatically.
signupSchema.index({ lastSignupAt: -1, deletedAt: 1 });
// Admin source filter + order (multikey index on the sources array).
signupSchema.index({ sources: 1, lastSignupAt: -1 });

export type SignupDoc = InferSchemaType<typeof signupSchema> & {
  _id: mongoose.Types.ObjectId;
};

type SignupModel = Model<SignupDoc> & SoftDeleteStatics<SignupDoc>;

export const Signup: SignupModel =
  (mongoose.models.Signup as SignupModel | undefined) ??
  (mongoose.model<SignupDoc>("Signup", signupSchema) as SignupModel);
