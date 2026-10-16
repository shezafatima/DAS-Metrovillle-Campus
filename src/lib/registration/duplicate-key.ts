import { createHash } from "node:crypto";
import { collapseSpaces } from "@/lib/validation/field-errors";

/**
 * The likely-duplicate key (research §7): a hash of the student's name, date
 * of birth and father's mobile, so a second copy of the child's name is never
 * kept in plain text. null when there is no father's mobile to compare.
 */
export function duplicateKey(input: {
  studentName: string;
  dateOfBirth: string;
  fatherMobile: string | null;
}): string | null {
  if (!input.fatherMobile) return null;
  const name = collapseSpaces(input.studentName).toLowerCase().normalize("NFC");
  return createHash("sha256").update(`${name}|${input.dateOfBirth}|${input.fatherMobile}`).digest("hex");
}
