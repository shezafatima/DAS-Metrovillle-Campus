import { randomBytes } from "node:crypto";

/**
 * The private document store contract (ADR-0004, ADR-0007). Callers deal
 * only in the generated key, never a URL.
 */
export interface DocumentStore {
  put(key: string, bytes: Uint8Array, contentType: "application/pdf"): Promise<void>;
  /** `null` when no document has this key. */
  get(key: string): Promise<{ body: ReadableStream<Uint8Array>; size: number } | null>;
  /** A missing document counts as success. */
  delete(key: string): Promise<void>;
  /** For tests and the retention sweep. */
  exists(key: string): Promise<boolean>;
}

/** The store could not be reached or refused the request. Never carries a URL or credentials. */
export class DocumentStoreUnavailableError extends Error {
  constructor(message = "The document store is unavailable") {
    super(message);
    this.name = "DocumentStoreUnavailableError";
  }
}

/** `cv/` + 32 random bytes (256 bits) + `.pdf`: nothing derived from the applicant or the upload. */
export const CV_KEY_PATTERN = /^cv\/[A-Za-z0-9_-]{43}\.pdf$/;

export function newCvKey(): string {
  return `cv/${randomBytes(32).toString("base64url")}.pdf`;
}
