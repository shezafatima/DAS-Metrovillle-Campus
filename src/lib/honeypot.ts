/**
 * Hidden spam-trap field for public forms (FR-031). Real visitors never
 * see or fill this field; a filled value means the request came from an
 * automated submitter, so the caller rejects it without storing
 * anything and without indicating why.
 */
export const HONEYPOT_FIELD = "website_url";

export function isHoneypotTripped(input: FormData | Record<string, unknown> | undefined | null): boolean {
  if (!input) return false;

  const value = input instanceof FormData ? input.get(HONEYPOT_FIELD) : input[HONEYPOT_FIELD];

  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}
