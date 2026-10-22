import { connectDb } from "@/lib/db";
import { StudentRegistration } from "@/models/student-registration";

/**
 * 022: the registration form now asks for one "Emergency contact number". Records saved before that hold
 * `emergencyContact: { name, phone }`. The migration moves the phone to `emergencyPhone` (so it stays the
 * emergency number) and the name to `legacyEmergencyName` (kept in the record, never shown on the form), then
 * removes the old object. Nothing is lost.
 *
 * It uses the raw collection, so soft-deleted records are included and `updatedAt` is left alone.
 * Idempotent: a migrated record no longer has `emergencyContact`.
 */
export interface EmergencyMigrationResult {
  /** Records the run would change (dry run) or changed (confirmed). */
  toChange: number;
  /** Old-shape records without a usable phone: reported, never touched. */
  skipped: number;
  applied: boolean;
}

const OLD_SHAPE = { emergencyContact: { $type: "object" }, emergencyPhone: null };
const OLD_SHAPE_WITH_PHONE = { ...OLD_SHAPE, "emergencyContact.phone": { $type: "string", $ne: "" } };

export async function migrateEmergencyContacts({ confirm }: { confirm: boolean }): Promise<EmergencyMigrationResult> {
  await connectDb();
  const collection = StudentRegistration.collection;
  const toChange = await collection.countDocuments(OLD_SHAPE_WITH_PHONE);
  const skipped = (await collection.countDocuments(OLD_SHAPE)) - toChange;
  if (!confirm || toChange === 0) return { toChange, skipped, applied: false };

  const result = await collection.updateMany(OLD_SHAPE_WITH_PHONE, [
    { $set: { emergencyPhone: "$emergencyContact.phone", legacyEmergencyName: { $ifNull: ["$emergencyContact.name", null] } } },
    { $unset: "emergencyContact" },
  ]);
  return { toChange: result.modifiedCount, skipped, applied: true };
}

export function formatEmergencyMigrationReport(result: EmergencyMigrationResult): string {
  const skipped = result.skipped > 0 ? ` ${result.skipped} old-shape record(s) have no phone and are left as they are.` : "";
  if (result.applied) return `Migrated ${result.toChange} registration(s): the phone is now the emergency number and the old name is kept.${skipped}`;
  return `Dry run: ${result.toChange} registration(s) would change. Nothing was written. Run again with --confirm to apply.${skipped}`;
}
