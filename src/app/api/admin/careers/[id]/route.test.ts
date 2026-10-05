// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { getTestSessionCookie, seedTestAdmin, seedTestContentManager } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";
import { seedApplication } from "@/test/career-applications";
import { createFakeDocumentStore, type FakeDocumentStore } from "@/test/fake-document-store";
import { CareerApplication } from "@/models/career-application";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const ADMIN_EMAIL = "careers-delete-admin@example.test";
const MANAGER_EMAIL = "careers-delete-manager@example.test";
const PASSWORD = "correct-horse-battery-staple";
const PDF = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describeWithDb("DELETE /api/admin/careers/[id]", ["careerApplications", "user", "account", "session"], () => {
  let store: FakeDocumentStore;
  let DELETE: (request: Request, context: ReturnType<typeof ctx>) => Promise<Response>;

  /** A fresh module graph signed in as the given account. */
  async function signInAs(cookie: string | null) {
    vi.doMock("next/headers", () => mockNextHeaders(new Headers(cookie ? { cookie } : {})));
    vi.resetModules();
    const documents = await import("@/lib/documents/store");
    documents.__setDocumentStoreForTests(store);
    ({ DELETE } = (await import("./route")) as never);
  }

  const remove = (id: string) => DELETE(new Request("http://localhost/x", { method: "DELETE" }), ctx(id));

  /** An application whose CV file really is in the store. */
  async function seedWithFile() {
    const seeded = await seedApplication({ name: "Ayesha Khan" });
    await store.put(seeded.key, PDF, "application/pdf");
    return seeded;
  }

  beforeEach(async () => {
    store = createFakeDocumentStore();
    await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
    await seedTestContentManager(MANAGER_EMAIL, PASSWORD, ["careers"]);
  });

  it("answers 404 for an unknown id and for text that is not an id", async () => {
    await signInAs(await getTestSessionCookie(ADMIN_EMAIL, PASSWORD));
    for (const id of ["507f1f77bcf86cd799439011", "nope", "../x"]) {
      const response = await remove(id);
      expect(response.status, id).toBe(404);
      expect(await response.json()).toEqual({ error: "not_found" });
    }
  });

  it("soft-deletes the application, removes its file, and records that the file is gone", async () => {
    const { id, key } = await seedWithFile();
    await signInAs(await getTestSessionCookie(ADMIN_EMAIL, PASSWORD));

    const response = await remove(id);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ id, deleted: true });

    const doc = await CareerApplication.collection.findOne({ _id: new (await import("mongoose")).Types.ObjectId(id) });
    expect(doc?.deletedAt).toBeInstanceOf(Date);
    expect(doc?.cv.removedAt).toBeInstanceOf(Date);
    expect(store.keys()).not.toContain(key);
  });

  it("a second delete of the same application is a 404", async () => {
    const { id } = await seedWithFile();
    await signInAs(await getTestSessionCookie(ADMIN_EMAIL, PASSWORD));
    expect((await remove(id)).status).toBe(200);
    expect((await remove(id)).status).toBe(404);
  });

  it("does not delete a pending application", async () => {
    const { id } = await seedApplication({ storedAt: null });
    await signInAs(await getTestSessionCookie(ADMIN_EMAIL, PASSWORD));
    expect((await remove(id)).status).toBe(404);
    expect(await CareerApplication.collection.countDocuments({ deletedAt: null })).toBe(1);
  });

  it("still deletes the application when the file cannot be removed, and leaves the removal for the sweep", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { id, key } = await seedWithFile();
    store.failNext("delete");
    await signInAs(await getTestSessionCookie(ADMIN_EMAIL, PASSWORD));

    const response = await remove(id);

    expect(response.status).toBe(200);
    const doc = await CareerApplication.collection.findOne({ _id: new (await import("mongoose")).Types.ObjectId(id) });
    expect(doc?.deletedAt).toBeInstanceOf(Date);
    expect(doc?.cv.removedAt).toBeNull(); // the sweep retries because this is still null
    const logged = info.mock.calls.map((call) => String(call[0])).find((line) => line.includes("career_cv_delete_failed"));
    expect(logged).toContain(id);
    expect(logged).not.toContain(key);
    info.mockRestore();
  });

  it("refuses a content manager who holds the careers permission, and changes nothing", async () => {
    const { id, key } = await seedWithFile();
    await signInAs(await getTestSessionCookie(MANAGER_EMAIL, PASSWORD));

    const response = await remove(id);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "forbidden" });
    expect((await CareerApplication.findById(id).lean())?.deletedAt).toBeNull();
    expect(store.keys()).toContain(key);
  });

  it("refuses a request with no session", async () => {
    const { id } = await seedWithFile();
    await signInAs(null);
    expect((await remove(id)).status).toBe(401);
    expect((await CareerApplication.findById(id).lean())?.deletedAt).toBeNull();
  });
});
