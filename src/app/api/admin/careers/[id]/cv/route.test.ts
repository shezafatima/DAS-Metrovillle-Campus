// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { getTestSessionCookie, seedTestContentManager } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";
import { createFakeDocumentStore, type FakeDocumentStore } from "@/test/fake-document-store";
import { newCvKey } from "@/lib/documents/types";
import { CareerApplication } from "@/models/career-application";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const EMAIL = "careers-cv-route@example.test";
const PASSWORD = "correct-horse-battery-staple";
const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
const CREATED_AT = new Date("2026-10-03T10:00:00Z");

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** Inserts an application directly and, when `inStore`, puts its file in the fake store. */
async function seedApplication(
  store: FakeDocumentStore,
  overrides: { storedAt?: Date | null; deletedAt?: Date | null; inStore?: boolean } = {},
) {
  const key = newCvKey();
  const result = await CareerApplication.collection.insertOne({
    name: "Ayesha Khan",
    email: "ayesha@example.com",
    phone: "+923001234567",
    qualification: "M.Ed",
    consentAt: CREATED_AT,
    cv: {
      key,
      size: PDF.byteLength,
      storedAt: overrides.storedAt === undefined ? CREATED_AT : overrides.storedAt,
      removedAt: null,
    },
    deletedAt: overrides.deletedAt ?? null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
  if (overrides.inStore ?? true) await store.put(key, PDF, "application/pdf");
  return { id: result.insertedId.toString(), key };
}

describeWithDb("GET /api/admin/careers/[id]/cv", ["careerApplications", "user", "account", "session"], () => {
  let store: FakeDocumentStore;
  let GET: (request: Request, context: ReturnType<typeof ctx>) => Promise<Response>;

  /** A fresh module graph signed in as a content manager holding the `careers` permission. */
  beforeEach(async () => {
    store = createFakeDocumentStore();
    await seedTestContentManager(EMAIL, PASSWORD, ["careers"]);
    const cookie = await getTestSessionCookie(EMAIL, PASSWORD);
    vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
    vi.resetModules();
    const documents = await import("@/lib/documents/store");
    documents.__setDocumentStoreForTests(store);
    ({ GET } = (await import("./route")) as never);
  });

  const download = (id: string) => GET(new Request("http://localhost/api/admin/careers/x/cv"), ctx(id));

  it("answers 404 for an id nobody has, and for text that is not an id", async () => {
    for (const id of ["507f1f77bcf86cd799439011", "nope", "../../etc/passwd", "507f1f77bcf86cd79943901"]) {
      const response = await download(id);
      expect(response.status, id).toBe(404);
      expect(await response.json()).toEqual({ error: "not_found" });
    }
  });

  it("answers 404 for a pending application (file not confirmed yet)", async () => {
    const { id } = await seedApplication(store, { storedAt: null });
    expect((await download(id)).status).toBe(404);
  });

  it("answers 404 for a soft-deleted application, even if its file is still there", async () => {
    const { id } = await seedApplication(store, { deletedAt: new Date() });
    expect((await download(id)).status).toBe(404);
  });

  it("answers 404 and logs only the application id when the stored file is missing", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { id, key } = await seedApplication(store, { inStore: false });

    const response = await download(id);

    expect(response.status).toBe(404);
    const logged = info.mock.calls.map((call) => String(call[0])).find((line) => line.includes("career_cv_missing"));
    expect(logged).toBeDefined();
    expect(logged).toContain(id);
    expect(logged).not.toContain(key);
    info.mockRestore();
  });

  it("answers 503 when the store is unavailable", async () => {
    const { id } = await seedApplication(store);
    store.setAvailable(false);
    const response = await download(id);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "unavailable" });
  });

  it("streams the PDF as an attachment with the protective headers", async () => {
    const { id, key } = await seedApplication(store);

    const response = await download(id);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="cv-ayesha-khan-2026-10-03.pdf"');
    expect(response.headers.get("content-length")).toBe(String(PDF.byteLength));
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toBe("sandbox");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PDF);

    // Nothing in the response reveals where the file lives.
    const headerText = JSON.stringify([...response.headers.entries()]);
    expect(headerText).not.toContain(key);
    expect(headerText).not.toMatch(/blob\.vercel-storage|\.data/);
  });
});
