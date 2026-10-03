import { DocumentStoreUnavailableError, type DocumentStore } from "@/lib/documents/types";

type Operation = "put" | "get" | "delete" | "exists";

export interface FakeDocumentStore extends DocumentStore {
  /** Makes the next call of `operation` throw `DocumentStoreUnavailableError`. */
  failNext(operation: Operation): void;
  /** Makes every call throw until `setAvailable(true)`. */
  setAvailable(available: boolean): void;
  keys(): string[];
  /** The stored bytes, for assertions. */
  read(key: string): Uint8Array | undefined;
}

/** In-memory `DocumentStore` for Vitest (injected with `__setDocumentStoreForTests`). */
export function createFakeDocumentStore(): FakeDocumentStore {
  const files = new Map<string, Uint8Array>();
  const failures = new Set<Operation>();
  let available = true;

  function check(operation: Operation): void {
    if (!available || failures.delete(operation)) throw new DocumentStoreUnavailableError();
  }

  return {
    async put(key, bytes) {
      check("put");
      if (files.has(key)) throw new DocumentStoreUnavailableError("Key already exists");
      files.set(key, new Uint8Array(bytes));
    },
    async get(key) {
      check("get");
      const bytes = files.get(key);
      if (!bytes) return null;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      });
      return { body, size: bytes.byteLength };
    },
    async delete(key) {
      check("delete");
      files.delete(key);
    },
    async exists(key) {
      check("exists");
      return files.has(key);
    },
    failNext(operation) {
      failures.add(operation);
    },
    setAvailable(value) {
      available = value;
    },
    keys() {
      return [...files.keys()];
    },
    read(key) {
      return files.get(key);
    },
  };
}
