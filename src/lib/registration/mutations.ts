import { connectDb } from "@/lib/db";
import { StudentRegistration } from "@/models/student-registration";
import type { RegistrationOutput } from "@/lib/validation/registration";
import { duplicateKey } from "./duplicate-key";
import { newReference } from "./reference";

/**
 * The one place a registration is created (ADR-0012, append-only). There is
 * no natural key: every valid submission becomes a new record, however many
 * share a parent's email or phone. Only the random `reference` is unique, so
 * a collision on it (vanishingly rare) is retried with a new draw.
 *
 * Nothing here logs a field value; callers log the registration `_id` only.
 */

const MAX_REFERENCE_TRIES = 5;

/** Five different references in a row were already taken. */
export class ReferenceExhaustedError extends Error {
  constructor() {
    super("Could not allocate a unique reference");
    this.name = "ReferenceExhaustedError";
  }
}

/** True for a Mongo duplicate-key error on the `reference` index. */
function isReferenceCollision(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, keyPattern } = error as { code?: unknown; keyPattern?: Record<string, unknown> };
  return code === 11000 && keyPattern !== undefined && "reference" in keyPattern;
}

export async function createRegistration(
  input: RegistrationOutput,
  now: Date = new Date(),
): Promise<{ id: string; reference: string }> {
  await connectDb();
  // The unique reference index must exist before the first insert relies on it.
  await StudentRegistration.init();
  const key = duplicateKey({
    studentName: input.studentName,
    dateOfBirth: input.dateOfBirth,
    fatherMobile: input.fatherMobile,
  });

  for (let attempt = 0; attempt < MAX_REFERENCE_TRIES; attempt += 1) {
    const reference = newReference();
    try {
      const created = await StudentRegistration.create({
        reference,
        studentName: input.studentName,
        fatherName: input.fatherName,
        motherName: input.motherName,
        email: input.email,
        dateOfBirth: input.dateOfBirth,
        fatherMobile: input.fatherMobile,
        motherMobile: input.motherMobile,
        address: input.address,
        emergencyContact: input.emergencyContact,
        className: input.className,
        motherTongue: input.motherTongue,
        motherTongueOther: input.motherTongueOther,
        vaccinated: input.vaccinated,
        medicalHistory: input.medicalHistory,
        referenceStudent: input.referenceStudent,
        remarks: input.remarks,
        // Set here, never taken from the client: consent was true when we got this far.
        consentAt: now,
        status: "new",
        duplicateKey: key,
      });
      return { id: created._id.toString(), reference };
    } catch (error) {
      if (isReferenceCollision(error)) continue;
      throw error;
    }
  }
  throw new ReferenceExhaustedError();
}
