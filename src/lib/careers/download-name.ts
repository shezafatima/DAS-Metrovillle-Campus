import { pktDateString } from "./rules";

const MAX_SLUG_LENGTH = 40;

/**
 * The file name an admin's browser saves a CV under: `cv-<name>-<date>.pdf`.
 * It is built from the applicant's name and applied date only, never from
 * the uploaded file's name (which is not even stored) and never from the
 * storage key. The name is reduced to ASCII letters, digits and hyphens, so
 * quotes, slashes and line breaks can never reach the header; a name with
 * no Latin letters (Urdu only) becomes "applicant".
 */
export function cvDownloadName({ name, createdAt }: { name: string; createdAt: Date }): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return `cv-${slug || "applicant"}-${pktDateString(createdAt)}.pdf`;
}
