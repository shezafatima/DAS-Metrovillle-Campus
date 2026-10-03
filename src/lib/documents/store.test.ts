// @vitest-environment node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetEnvCacheForTests } from "@/lib/env";
import { createLocalDocumentStore } from "./local";
import { CV_KEY_PATTERN, DocumentStoreUnavailableError, newCvKey } from "./types";
import { __setDocumentStoreForTests, getDocumentStore } from "./store";
import { createFakeDocumentStore } from "@/test/fake-document-store";

const PDF = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");

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

describe("newCvKey", () => {
  it("has the generated shape: cv/ + 43 URL-safe characters + .pdf", () => {
    expect(newCvKey()).toMatch(CV_KEY_PATTERN);
  });

  it("never repeats across 1,000 keys", () => {
    const keys = new Set(Array.from({ length: 1000 }, () => newCvKey()));
    expect(keys.size).toBe(1000);
  });
});

describe("local document store", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "careers-store-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips put, exists, get and delete", async () => {
    const store = createLocalDocumentStore(dir);
    const key = newCvKey();
    expect(await store.exists(key)).toBe(false);
    await store.put(key, PDF, "application/pdf");
    expect(await store.exists(key)).toBe(true);
    const found = await store.get(key);
    expect(found?.size).toBe(PDF.byteLength);
    expect(Buffer.from(await readAll(found!.body)).toString()).toBe("%PDF-1.4\n%%EOF\n");
    await store.delete(key);
    expect(await store.exists(key)).toBe(false);
    expect(await store.get(key)).toBeNull();
  });

  it("treats deleting a missing document as success", async () => {
    await expect(createLocalDocumentStore(dir).delete(newCvKey())).resolves.toBeUndefined();
  });

  it("refuses to overwrite an existing key", async () => {
    const store = createLocalDocumentStore(dir);
    const key = newCvKey();
    await store.put(key, PDF, "application/pdf");
    await expect(store.put(key, PDF, "application/pdf")).rejects.toThrow();
  });

  it("rejects any key outside the generated pattern, including path tricks", async () => {
    const store = createLocalDocumentStore(dir);
    for (const key of ["../outside.pdf", "cv/../../x.pdf", "cv/short.pdf", "/etc/passwd", "cv/" + "a".repeat(43)]) {
      await expect(store.put(key, PDF, "application/pdf")).rejects.toBeInstanceOf(DocumentStoreUnavailableError);
    }
  });

  it("throws DocumentStoreUnavailableError for every call while the .unavailable sentinel exists", async () => {
    const store = createLocalDocumentStore(dir);
    await writeFile(path.join(dir, ".unavailable"), "");
    const key = newCvKey();
    await expect(store.put(key, PDF, "application/pdf")).rejects.toBeInstanceOf(DocumentStoreUnavailableError);
    await expect(store.get(key)).rejects.toBeInstanceOf(DocumentStoreUnavailableError);
    await expect(store.delete(key)).rejects.toBeInstanceOf(DocumentStoreUnavailableError);
    await expect(store.exists(key)).rejects.toBeInstanceOf(DocumentStoreUnavailableError);
    await rm(path.join(dir, ".unavailable"));
    await expect(store.put(key, PDF, "application/pdf")).resolves.toBeUndefined();
  });
});

describe("getDocumentStore", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    __resetEnvCacheForTests();
    Object.assign(process.env, {
      MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net",
      BETTER_AUTH_SECRET: "a".repeat(32),
      BETTER_AUTH_URL: "http://localhost:3000",
      CLOUDINARY_CLOUD_NAME: "demo-cloud",
      CLOUDINARY_API_KEY: "123456789012345",
      CLOUDINARY_API_SECRET: "s".repeat(24),
      NODE_ENV: "test",
      DOCUMENT_STORE_DRIVER: "local",
      DOCUMENT_STORE_LOCAL_DIR: os.tmpdir(),
    });
  });

  afterEach(() => {
    __setDocumentStoreForTests(null);
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    __resetEnvCacheForTests();
  });

  it("returns an injected store, then goes back to the configured one", () => {
    const fake = createFakeDocumentStore();
    __setDocumentStoreForTests(fake);
    expect(getDocumentStore()).toBe(fake);
    __setDocumentStoreForTests(null);
    expect(getDocumentStore()).not.toBe(fake);
  });

  it("creates the configured store once per process", () => {
    expect(getDocumentStore()).toBe(getDocumentStore());
  });
});

describe("fake document store", () => {
  it("fails exactly the next call, or every call while unavailable", async () => {
    const fake = createFakeDocumentStore();
    const key = newCvKey();
    fake.failNext("put");
    await expect(fake.put(key, PDF, "application/pdf")).rejects.toBeInstanceOf(DocumentStoreUnavailableError);
    await fake.put(key, PDF, "application/pdf");
    expect(fake.keys()).toEqual([key]);
    fake.setAvailable(false);
    await expect(fake.exists(key)).rejects.toBeInstanceOf(DocumentStoreUnavailableError);
  });
});
