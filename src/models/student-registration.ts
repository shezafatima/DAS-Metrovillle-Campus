import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { softDeletePlugin, type SoftDeleteStatics } from "@/lib/soft-delete";
import { MOTHER_TONGUES, REGISTRATION_STATUSES } from "@/lib/registration/rules";

/**
 * Student registration (013) — data-model.md "StudentRegistration".
 *
 * Write rule (ADR-0012, Constitution VI): APPEND-ONLY with no natural key.
 * Each valid submission inserts a new record; nothing is refused, merged or
 * upserted because of a shared email, phone or student (siblings share
 * contacts). Repeats are flagged on read from `duplicateKey`. The only
 * database-enforced uniqueness is `reference`.
 *
 * Not stored on purpose: the visitor's IP, user agent and the raw request body.
 */
const historyEntrySchema = new Schema(
  {
    at: { type: Date, required: true },
    action: { type: String, enum: ["status", "deleted", "restored"], required: true },
    from: { type: String, enum: REGISTRATION_STATUSES },
    to: { type: String, enum: REGISTRATION_STATUSES },
    byUserId: { type: String, required: true },
    byEmail: { type: String, required: true },
  },
  { _id: false },
);

const studentRegistrationSchema = new Schema(
  {
    reference: { type: String, required: true },
    studentName: { type: String, required: true },
    fatherName: { type: String, required: true },
    motherName: { type: String, required: true },
    email: { type: String, required: true },
    // "YYYY-MM-DD": a calendar date with no time zone.
    dateOfBirth: { type: String, required: true },
    fatherMobile: { type: String, default: null },
    motherMobile: { type: String, default: null },
    address: { type: String, required: true },
    // E.164. Not `required` here: the zod schema guarantees it on every new record, and records from before
    // 2026-10 hold it in `emergencyContact` until scripts/migrate-emergency-contact.ts has run.
    emergencyPhone: { type: String, default: null },
    // Before 2026-10 the form also asked for the contact's name. Kept for old records, never collected or shown on the form.
    legacyEmergencyName: { type: String, default: null },
    // Old shape (read only): `{ name, phone }`, replaced by the two fields above.
    emergencyContact: {
      type: new Schema({ name: { type: String }, phone: { type: String } }, { _id: false }),
      default: undefined,
    },
    className: { type: String, required: true },
    motherTongue: { type: String, enum: MOTHER_TONGUES, required: true },
    motherTongueOther: { type: String, default: null },
    // Health information: shown in its own block, never in a list or notification.
    vaccinated: { type: Boolean, required: true },
    medicalHistory: { type: String, default: null },
    referenceStudent: {
      type: new Schema(
        {
          name: { type: String, required: true },
          className: { type: String, required: true },
          relation: { type: String, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    remarks: { type: String, default: null },
    consentAt: { type: Date, required: true },
    status: { type: String, enum: REGISTRATION_STATUSES, default: "new" },
    history: { type: [historyEntrySchema], default: [] },
    duplicateKey: { type: String, default: null },
    deletedBy: { type: String, default: null },
  },
  { timestamps: true, collection: "studentRegistrations" },
);

studentRegistrationSchema.plugin(softDeletePlugin);

studentRegistrationSchema.index({ reference: 1 }, { unique: true });
// Admin list order and the retention sweep.
studentRegistrationSchema.index({ createdAt: -1, _id: -1 });
studentRegistrationSchema.index({ className: 1, createdAt: -1 });
studentRegistrationSchema.index({ duplicateKey: 1 }, { sparse: true });

export type StudentRegistrationDoc = InferSchemaType<typeof studentRegistrationSchema> & {
  _id: mongoose.Types.ObjectId;
};

type StudentRegistrationModel = Model<StudentRegistrationDoc> & SoftDeleteStatics<StudentRegistrationDoc>;

export const StudentRegistration: StudentRegistrationModel =
  (mongoose.models.StudentRegistration as StudentRegistrationModel | undefined) ??
  (mongoose.model<StudentRegistrationDoc>("StudentRegistration", studentRegistrationSchema) as StudentRegistrationModel);
