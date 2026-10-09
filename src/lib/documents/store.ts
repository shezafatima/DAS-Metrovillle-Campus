import { getEnv } from "@/lib/env";
import { createLocalDocumentStore } from "./local";
import { createVercelBlobDocumentStore } from "./vercel-blob";
import type { DocumentStore } from "./types";

/**
 * The private document store (ADR-0004, ADR-0007): the only module that
 * stores or reads documents such as CVs. Nothing else imports `@vercel/blob`,
 * and nothing under src/lib/cloudinary.ts or src/lib/uploads/ is used for
 * documents.
 */
export { CV_KEY_PATTERN, DocumentStoreUnavailableError, newCvKey } from "./types";
export type { DocumentStore } from "./types";

let cachedStore: DocumentStore | undefined;
let overrideStore: DocumentStore | null = null;

/** The store chosen by `DOCUMENT_STORE_DRIVER`, created once per process. */
export function getDocumentStore(): DocumentStore {
  if (overrideStore) return overrideStore;
  if (cachedStore) return cachedStore;

  const env = getEnv();
  cachedStore =
    env.DOCUMENT_STORE_DRIVER === "local"
      ? createLocalDocumentStore(env.DOCUMENT_STORE_LOCAL_DIR)
      : createVercelBlobDocumentStore();
  return cachedStore;
}

/** Test-only: inject a store (or `null` to go back to the configured one). */
export function __setDocumentStoreForTests(store: DocumentStore | null): void {
  overrideStore = store;
  cachedStore = undefined;
}
