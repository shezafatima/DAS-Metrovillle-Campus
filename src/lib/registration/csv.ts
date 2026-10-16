import { registrationCopy } from "@/content/registration";
import { toCsv } from "@/lib/csv";
import { formatPhoneLocal } from "@/lib/phone";
import type { RegistrationDetail } from "./admin-queries";

/**
 * CSV export (FR-038): every field except history, the duplicate key and the
 * deleting admin, plus status and a "Likely duplicate" column. Encoding is the
 * shared src/lib/csv.ts (BOM, CRLF, formula guard). Mobiles are written in
 * local format and the submitted time in Pakistan time.
 */
export const REGISTRATION_CSV_HEADERS = [
  "Reference",
  "Submitted",
  "Status",
  "Likely duplicate",
  "Student name",
  "Date of birth",
  "Class",
  "Father's name",
  "Father's mobile",
  "Mother's name",
  "Mother's mobile",
  "Email",
  "Address",
  "Emergency contact name",
  "Emergency contact phone",
  "Mother tongue",
  "Vaccinated",
  "Medical history",
  "Reference student name",
  "Reference student class",
  "Reference relation",
  "Remarks",
  "Consent given at",
] as const;

const KARACHI = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Karachi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "2027-01-05 14:05" in Pakistan time. */
export function formatPakistanDateTime(iso: string): string {
  const parts = Object.fromEntries(KARACHI.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

const local = (e164: string | null) => (e164 ? formatPhoneLocal(e164) : "");

export function registrationsToCsv(rows: readonly RegistrationDetail[]): string {
  return toCsv(
    REGISTRATION_CSV_HEADERS,
    rows.map((row) => [
      row.reference,
      formatPakistanDateTime(row.submittedAt),
      registrationCopy.statusLabels[row.status],
      row.likelyDuplicate ? "Yes" : "No",
      row.studentName,
      row.dateOfBirth,
      row.className,
      row.fatherName,
      local(row.fatherMobile),
      row.motherName,
      local(row.motherMobile),
      row.email,
      row.address,
      row.emergencyName,
      local(row.emergencyPhone),
      row.motherTongue === "other" && row.motherTongueOther
        ? `${registrationCopy.motherTongueOptions.other}: ${row.motherTongueOther}`
        : registrationCopy.motherTongueOptions[row.motherTongue],
      row.vaccinated ? "Yes" : "No",
      row.medicalHistory ?? "",
      row.referenceStudent?.name ?? "",
      row.referenceStudent?.className ?? "",
      row.referenceStudent?.relation ?? "",
      row.remarks ?? "",
      formatPakistanDateTime(row.consentAt),
    ]),
  );
}
