import "server-only";
import { createHash } from "node:crypto";
import type { GroupValue } from "./types";

/**
 * A panel's fingerprint (014, research R4, ADR-0013): a hash of the panel's
 * own fields as stored (live list items, defaults merged). A save carries
 * the fingerprint it was loaded with; if the stored panel no longer matches,
 * someone else changed that panel and the save is a conflict. Sibling panels
 * of the same group have their own fingerprints, so saving one never makes
 * another stale. Never stored: it is derived from data already stored.
 */

/** JSON with object keys sorted at every level, so key order never changes the hash. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  // An undefined value hashes like null, so "missing" and "null" never differ.
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}

export const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/;

/** 32 lowercase hex characters from the panel's fields of `liveValue`. */
export function panelFingerprint(fields: readonly string[], liveValue: GroupValue): string {
  const picked = Object.fromEntries(fields.map((key) => [key, liveValue[key]]));
  return createHash("sha256").update(canonical(picked)).digest("hex").slice(0, 32);
}
