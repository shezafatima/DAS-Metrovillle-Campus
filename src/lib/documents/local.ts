import { createReadStream } from "node:fs";
import { access, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { CV_KEY_PATTERN, DocumentStoreUnavailableError, type DocumentStore } from "./types";

/**
 * Development and E2E driver: files in a gitignored directory outside
 * `public/`, so no URL serves them. Production refuses this driver in
 * getEnv(). A `.unavailable` file in the directory makes every call throw,
 * which is how the E2E specs prove "store down → details kept" without a
 * runtime switch in shared code.
 */
export function createLocalDocumentStore(directory: string): DocumentStore {
  const root = path.resolve(process.cwd(), directory);

  async function guard(): Promise<void> {
    try {
      await access(path.join(root, ".unavailable"));
    } catch {
      return;
    }
    throw new DocumentStoreUnavailableError();
  }

  function fileFor(key: string): string {
    // Keys are generated, never typed: refuse anything else so a key can
    // never point outside the store directory.
    if (!CV_KEY_PATTERN.test(key)) throw new DocumentStoreUnavailableError("Invalid document key");
    return path.join(root, key);
  }

  return {
    async put(key, bytes) {
      await guard();
      const file = fileFor(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes, { flag: "wx" });
    },
    async get(key) {
      await guard();
      const file = fileFor(key);
      try {
        const { size } = await stat(file);
        const body = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>;
        return { body, size };
      } catch {
        return null;
      }
    },
    async delete(key) {
      await guard();
      await rm(fileFor(key), { force: true });
    },
    async exists(key) {
      await guard();
      try {
        await readFile(fileFor(key));
        return true;
      } catch {
        return false;
      }
    },
  };
}
