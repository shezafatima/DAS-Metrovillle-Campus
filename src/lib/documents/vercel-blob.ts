import { BlobNotFoundError, del, get, head, put } from "@vercel/blob";
import { DocumentStoreUnavailableError, type DocumentStore } from "./types";

/**
 * Production driver: a PRIVATE Vercel Blob store (ADR-0007). Every call
 * passes `access: "private"`. Authentication is OIDC on Vercel
 * (BLOB_STORE_ID + the runtime token) or BLOB_READ_WRITE_TOKEN elsewhere,
 * both picked up by the SDK from the environment. The blob URL the SDK
 * returns is discarded: only the generated key is ever stored or logged.
 */
export function createVercelBlobDocumentStore(): DocumentStore {
  async function wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof DocumentStoreUnavailableError) throw error;
      // Never forward the SDK error: its message can contain store details.
      throw new DocumentStoreUnavailableError();
    }
  }

  return {
    async put(key, bytes, contentType) {
      await wrap(() =>
        put(key, Buffer.from(bytes), {
          access: "private",
          contentType,
          addRandomSuffix: false,
          allowOverwrite: false,
        }),
      );
    },
    async get(key) {
      return wrap(async () => {
        const result = await get(key, { access: "private" });
        if (!result || result.statusCode !== 200) return null;
        return { body: result.stream, size: result.blob.size };
      });
    },
    async delete(key) {
      await wrap(async () => {
        try {
          await del(key);
        } catch (error) {
          if (error instanceof BlobNotFoundError) return;
          throw error;
        }
      });
    },
    async exists(key) {
      return wrap(async () => {
        try {
          await head(key);
          return true;
        } catch (error) {
          if (error instanceof BlobNotFoundError) return false;
          throw error;
        }
      });
    },
  };
}
