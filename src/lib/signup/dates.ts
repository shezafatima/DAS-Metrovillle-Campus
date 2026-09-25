export { formatAdminDateTime as formatSignupDateTime } from "@/lib/admin-datetime";

const CSV_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Karachi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `YYYY-MM-DD` in PKT — used for the export filename's date stamp. */
export function csvDateStamp(date: Date): string {
  return CSV_DATE_FORMATTER.format(date);
}
