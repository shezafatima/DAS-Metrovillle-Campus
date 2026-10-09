// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { createFakeDocumentStore, type FakeDocumentStore } from "@/test/fake-document-store";
import { DocumentStoreUnavailableError } from "@/lib/documents/types";
import { CareerApplication } from "@/models/career-application";
import { createCareerApplication } from "./mutations";
import type { CareerApplicationFields } from "@/lib/validation/career-application";

// Cold first call = module load + index creation on a remote Atlas test database.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const FIELDS: CareerApplicationFields = {
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  phone: "+923001234567",
  qualification: "M.Ed",
  consent: true,
};
const PDF = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");

describeWithDb("createCareerApplication", ["careerApplications", "careerApplicationLocks"], () => {
  let store: FakeDocumentStore;

  beforeEach(() => {
    store = createFakeDocumentStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores the application as stored (cv.storedAt set) with its file in the store", async () => {
    const now = new Date("2026-10-03T10:00:00Z");
    const { id } = await createCareerApplication(FIELDS, PDF, now, store);

    const doc = await CareerApplication.findById(id).lean();
    expect(doc).not.toBeNull();
    expect(doc!.cv.storedAt).toBeInstanceOf(Date);
    expect(doc!.cv.removedAt).toBeNull();
    expect(doc!.cv.size).toBe(PDF.byteLength);
    expect(store.keys()).toEqual([doc!.cv.key]);
    expect(Buffer.from(store.read(doc!.cv.key)!).toString()).toBe("%PDF-1.4\n%%EOF\n");
  });

  it("sets consentAt on the server and keeps no filename or file type on the record", async () => {
    const now = new Date("2026-10-03T10:00:00Z");
    const { id } = await createCareerApplication(FIELDS, PDF, now, store);
    const doc = (await CareerApplication.findById(id).lean())!;

    expect(doc.consentAt.toISOString()).toBe(now.toISOString());
    expect(Object.keys(doc).sort()).toEqual(
      ["_id", "__v", "consentAt", "createdAt", "cv", "deletedAt", "email", "name", "phone", "qualification", "updatedAt"].sort(),
    );
    expect(Object.keys(doc.cv).sort()).toEqual(["key", "removedAt", "size", "storedAt"]);
  });

  it("leaves no application when the store write fails", async () => {
    store.failNext("put");

    await expect(createCareerApplication(FIELDS, PDF, new Date(), store)).rejects.toBeInstanceOf(DocumentStoreUnavailableError);

    expect(await CareerApplication.countDocuments({})).toBe(0);
    expect(await CareerApplication.collection.countDocuments({})).toBe(0);
    expect(store.keys()).toEqual([]);
  });

  it("removes both the file and the record when confirming the file in the database fails", async () => {
    vi.spyOn(CareerApplication, "updateOne").mockRejectedValueOnce(new Error("database went away"));

    await expect(createCareerApplication(FIELDS, PDF, new Date(), store)).rejects.toBeInstanceOf(DocumentStoreUnavailableError);

    expect(await CareerApplication.collection.countDocuments({})).toBe(0);
    expect(store.keys()).toEqual([]);
  });

  it("gives two applications different storage keys", async () => {
    const first = await createCareerApplication(FIELDS, PDF, new Date(), store);
    const second = await createCareerApplication(
      { ...FIELDS, email: "other@example.com", phone: "+923007654321" },
      PDF,
      new Date(),
      store,
    );
    expect(first.id).not.toBe(second.id);
    expect(new Set(store.keys()).size).toBe(2);
  });
});
