// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { createFakeDocumentStore, type FakeDocumentStore } from "@/test/fake-document-store";
import { CV_KEY_PATTERN } from "@/lib/documents/types";
import { __setDocumentStoreForTests } from "@/lib/documents/store";
import { CareerApplication } from "@/models/career-application";
import { POST } from "@/app/api/public/careers/route";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
const UPLOADED_NAME = "ayesha-khan-resume-03001234567.pdf";

function request(ip: string): Request {
  const form = new FormData();
  form.set("name", "Ayesha Khan");
  form.set("email", "ayesha.khan@example.com");
  form.set("phone", "03001234567");
  form.set("qualification", "Master of Education");
  form.set("consent", "true");
  form.append("cv", new File([PDF as BlobPart], UPLOADED_NAME, { type: "application/pdf" }));
  return new Request("http://localhost/api/public/careers", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: form,
  });
}

describeWithDb("stored CV keys cannot be guessed from the application", ["careerApplications", "careerApplicationLocks", "throttles"], () => {
  let store: FakeDocumentStore;

  beforeEach(() => {
    store = createFakeDocumentStore();
    __setDocumentStoreForTests(store);
  });

  afterEach(() => {
    __setDocumentStoreForTests(null);
  });

  it("derives nothing from the id, name, email, phone, qualification, dates or uploaded file name", async () => {
    const response = await POST(request("198.51.100.60"));
    expect(response.status).toBe(200);

    const doc = (await CareerApplication.findOne({ email: "ayesha.khan@example.com" }).lean())!;
    const key = doc.cv.key.toLowerCase();

    // Only tokens long enough that a random key could not contain them by chance.
    const iso = doc.createdAt.toISOString();
    const forbidden = [
      doc._id.toString(),
      "ayesha",
      "ayesha.khan",
      "example.com",
      "3001234567",
      "03001234567",
      "923001234567",
      "education",
      iso.slice(0, 10),
      iso.slice(0, 10).replaceAll("-", ""),
      UPLOADED_NAME.replace(/\.pdf$/, ""),
      "resume",
    ];
    for (const token of forbidden) {
      expect(key, `key must not contain "${token}"`).not.toContain(token.toLowerCase());
    }
    // And it is exactly the generated shape, stored under no other name.
    expect(doc.cv.key).toMatch(CV_KEY_PATTERN);
    expect(store.keys()).toEqual([doc.cv.key]);
  });

  it("never stores the uploaded file name anywhere on the record", async () => {
    await POST(request("198.51.100.61"));
    const doc = await CareerApplication.collection.findOne({ email: "ayesha.khan@example.com" });
    expect(JSON.stringify(doc)).not.toContain("resume");
    expect(JSON.stringify(doc)).not.toContain(UPLOADED_NAME);
    expect(JSON.stringify(doc)).not.toContain("application/pdf"); // the declared file type is not kept either
  });

  it("gives two applications with identical data different keys", async () => {
    expect((await POST(request("198.51.100.62"))).status).toBe(200);
    // Thirty days later the same person can apply again with exactly the same details.
    const earlier = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await CareerApplication.collection.updateMany({}, { $set: { createdAt: earlier, updatedAt: earlier } });
    expect((await POST(request("198.51.100.63"))).status).toBe(200);

    const docs = await CareerApplication.find({ email: "ayesha.khan@example.com" }).lean();
    expect(docs).toHaveLength(2);
    expect(docs[0].cv.key).not.toBe(docs[1].cv.key);
    for (const doc of docs) expect(doc.cv.key).toMatch(CV_KEY_PATTERN);
  });
});
