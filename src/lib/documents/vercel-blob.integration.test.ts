// @vitest-environment node
import { head } from "@vercel/blob";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createVercelBlobDocumentStore } from "./vercel-blob";
import { DocumentStoreUnavailableError, newCvKey } from "./types";

/**
 * Real-store check for the production driver (ADR-0007). It writes to, reads
 * from and deletes in a REAL private Vercel Blob store, so it only runs when
 * asked to:
 *
 *   RUN_BLOB_INTEGRATION=1 bash scripts/with-test-env.sh npx vitest run src/lib/documents/vercel-blob.integration.test.ts
 *
 * with BLOB_READ_WRITE_TOKEN (of a PRIVATE store; use a throwaway one, not
 * the production store) in .env.local. Every object it creates uses a
 * generated cv/ key and is deleted again; nothing here prints the token or
 * a blob URL.
 */
const enabled = process.env.RUN_BLOB_INTEGRATION === "1" && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const suite = enabled ? describe : describe.skip;

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

suite("Vercel Blob document store (real private store)", () => {
  const store = createVercelBlobDocumentStore();
  const created: string[] = [];

  afterAll(async () => {
    for (const key of created) await store.delete(key).catch(() => {});
  });

  it("round-trips put, exists, get and delete", async () => {
    const key = newCvKey();
    created.push(key);

    expect(await store.exists(key)).toBe(false);
    await store.put(key, PDF, "application/pdf");
    expect(await store.exists(key)).toBe(true);

    const found = await store.get(key);
    expect(found).not.toBeNull();
    expect(found!.size).toBe(PDF.byteLength);
    expect(Buffer.from(await readAll(found!.body)).toString()).toBe(Buffer.from(PDF).toString());

    await store.delete(key);
    expect(await store.exists(key)).toBe(false);
    expect(await store.get(key)).toBeNull();
  });

  it("treats deleting a missing document as success", async () => {
    await expect(store.delete(newCvKey())).resolves.toBeUndefined();
  });

  it("keeps the key exactly as given (no random suffix) and refuses to overwrite it", async () => {
    const key = newCvKey();
    created.push(key);
    await store.put(key, PDF, "application/pdf");
    expect((await head(key)).pathname).toBe(key);
    await expect(store.put(key, PDF, "application/pdf")).rejects.toBeInstanceOf(DocumentStoreUnavailableError);
  });

  it("stores the object privately: its URL cannot be fetched without credentials", async () => {
    const key = newCvKey();
    created.push(key);
    await store.put(key, PDF, "application/pdf");

    const { url, downloadUrl } = await head(key);
    for (const address of [url, downloadUrl]) {
      const response = await fetch(address, { redirect: "manual" });
      expect([401, 403], "an anonymous request must be refused").toContain(response.status);
      await response.arrayBuffer().catch(() => {});
    }
  });

  it("reports an unusable token as DocumentStoreUnavailableError, never leaking the SDK error", async () => {
    const original = process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_invalid_token_for_test";
    try {
      const error = await store.exists(newCvKey()).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(DocumentStoreUnavailableError);
      expect((error as Error).message).toBe("The document store is unavailable");
    } finally {
      process.env.BLOB_READ_WRITE_TOKEN = original;
    }
  });
});
