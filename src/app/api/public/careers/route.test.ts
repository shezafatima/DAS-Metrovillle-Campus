// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { createFakeDocumentStore, type FakeDocumentStore } from "@/test/fake-document-store";
import { __setDocumentStoreForTests } from "@/lib/documents/store";
import { CAREERS_BODY_MAX_BYTES, CV_MAX_BYTES } from "@/lib/careers/cv-limits";
import { lockKey } from "@/lib/careers/identity-lock";
import { reapplyFrom } from "@/lib/careers/rules";
import { CareerApplication } from "@/models/career-application";
import { CareerApplicationLock } from "@/models/career-application-lock";
import { POST } from "./route";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const enc = (text: string) => new TextEncoder().encode(text);
const VALID_PDF = enc("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

/** A valid PDF padded to exactly `size` bytes. */
function pdfOfSize(size: number): Uint8Array {
  const head = enc("%PDF-1.4\n");
  const tail = enc("\n%%EOF");
  const bytes = new Uint8Array(size).fill(0x20);
  bytes.set(head, 0);
  bytes.set(tail, size - tail.length);
  return bytes;
}

const VALID_FIELDS: Record<string, string> = {
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  phone: "03001234567",
  qualification: "M.Ed",
  consent: "true",
};

interface Options {
  fields?: Record<string, string | undefined>;
  files?: Array<Uint8Array>;
  ip?: string;
  headers?: Record<string, string>;
}

function applicationRequest({ fields = {}, files = [VALID_PDF], ip = "198.51.100.10", headers = {} }: Options = {}): Request {
  const form = new FormData();
  for (const [name, value] of Object.entries({ ...VALID_FIELDS, ...fields })) {
    if (value !== undefined) form.set(name, value);
  }
  for (const bytes of files) form.append("cv", new File([bytes as BlobPart], "resume.pdf", { type: "application/pdf" }));
  return new Request("http://localhost/api/public/careers", {
    method: "POST",
    headers: { "x-forwarded-for": ip, ...headers },
    body: form,
  });
}

describeWithDb("POST /api/public/careers", ["careerApplications", "careerApplicationLocks", "throttles"], () => {
  let store: FakeDocumentStore;

  beforeEach(() => {
    store = createFakeDocumentStore();
    __setDocumentStoreForTests(store);
  });

  afterEach(() => {
    __setDocumentStoreForTests(null);
  });

  it("stores a valid application and its CV, and answers with an id-free { ok: true }", async () => {
    const response = await POST(applicationRequest({ ip: "198.51.100.11" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });

    const doc = await CareerApplication.findOne({ email: "ayesha@example.com" }).lean();
    expect(doc).not.toBeNull();
    expect(doc!.phone).toBe("+923001234567");
    expect(doc!.cv.storedAt).toBeInstanceOf(Date);
    expect(store.keys()).toEqual([doc!.cv.key]);
  });

  it("rejects a request whose Content-Length is over the cap with 413", async () => {
    const response = await POST(
      applicationRequest({ ip: "198.51.100.12", headers: { "content-length": String(CAREERS_BODY_MAX_BYTES + 1) } }),
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "too_large" });
    expect(store.keys()).toEqual([]);
  });

  it("rejects a body over the cap with 413 even when no Content-Length is sent", async () => {
    const response = await POST(applicationRequest({ ip: "198.51.100.13", files: [pdfOfSize(CAREERS_BODY_MAX_BYTES + 1)] }));
    expect(response.status).toBe(413);
    expect(store.keys()).toEqual([]);
  });

  it("returns 400 for a body that is not multipart", async () => {
    const response = await POST(
      new Request("http://localhost/api/public/careers", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.14" },
        body: JSON.stringify(VALID_FIELDS),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed multipart", async () => {
    const response = await POST(
      new Request("http://localhost/api/public/careers", {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=xyz", "x-forwarded-for": "198.51.100.15" },
        body: "this is not multipart",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 naming every missing field, the CV included", async () => {
    const response = await POST(
      applicationRequest({
        ip: "198.51.100.16",
        fields: { name: "", email: "nope", phone: "123", qualification: "", consent: undefined },
        files: [],
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("validation");
    expect(Object.keys(body.fields).sort()).toEqual(["consent", "cv", "email", "name", "phone", "qualification"]);
    expect(body.fields.cv).toBe("Choose your CV as a PDF file.");
  });

  it("rejects a PNG renamed .pdf on its content", async () => {
    const response = await POST(applicationRequest({ ip: "198.51.100.17", files: [PNG] }));
    expect(response.status).toBe(400);
    expect((await response.json()).fields.cv).toBe("Your CV must be a PDF file.");
    expect(store.keys()).toEqual([]);
    expect(await CareerApplication.collection.countDocuments({})).toBe(0);
  });

  it("rejects a PDF one byte over the limit with a message that states it", async () => {
    const response = await POST(applicationRequest({ ip: "198.51.100.18", files: [pdfOfSize(CV_MAX_BYTES + 1)] }));
    expect(response.status).toBe(400);
    expect((await response.json()).fields.cv).toBe("Your CV must be 4 MB or smaller.");
    expect(store.keys()).toEqual([]);
  });

  it("accepts a PDF of exactly the limit", async () => {
    const response = await POST(applicationRequest({ ip: "198.51.100.19", files: [pdfOfSize(CV_MAX_BYTES)] }));
    expect(response.status).toBe(200);
    expect(store.keys()).toHaveLength(1);
  });

  it("rejects an empty file", async () => {
    const response = await POST(applicationRequest({ ip: "198.51.100.20", files: [new Uint8Array(0)] }));
    expect(response.status).toBe(400);
    expect((await response.json()).fields.cv).toBe("Your CV file is empty.");
  });

  it("rejects missing consent", async () => {
    const response = await POST(applicationRequest({ ip: "198.51.100.21", fields: { consent: "false" } }));
    expect(response.status).toBe(400);
    expect((await response.json()).fields.consent).toBe("Please tick the box to agree before applying.");
    expect(store.keys()).toEqual([]);
  });

  it("refuses two CV parts and stores nothing", async () => {
    const response = await POST(applicationRequest({ ip: "198.51.100.22", files: [VALID_PDF, VALID_PDF] }));
    expect(response.status).toBe(400);
    expect((await response.json()).fields.cv).toBe("Attach one PDF only.");
    expect(store.keys()).toEqual([]);
    expect(await CareerApplication.collection.countDocuments({})).toBe(0);
  });

  it("returns 503 store_unavailable and leaves no record when the store is down", async () => {
    store.setAvailable(false);
    const response = await POST(applicationRequest({ ip: "198.51.100.23" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "store_unavailable" });
    expect(await CareerApplication.collection.countDocuments({})).toBe(0);
  });

  it("discards a honeypot submission with the same success shape, stores nothing and does not throttle", async () => {
    const ip = "198.51.100.24";
    const response = await POST(applicationRequest({ ip, fields: { website_url: "http://spam.example" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await CareerApplication.collection.countDocuments({})).toBe(0);
    expect(store.keys()).toEqual([]);

    const { Throttle } = await import("@/models/throttle");
    expect(await Throttle.findOne({ key: `form:careers:ip:${ip}` })).toBeNull();
  });

  it("refuses a repeat inside the window with the same 409 whichever field matched, and no stored detail", async () => {
    const first = await POST(applicationRequest({ ip: "198.51.100.40" }));
    expect(first.status).toBe(200);
    const original = await CareerApplication.findOne({ email: "ayesha@example.com" }).lean();
    const stored = JSON.stringify(original);

    // Same email, different phone.
    const byEmail = await POST(
      applicationRequest({ ip: "198.51.100.41", fields: { phone: "03007654321", name: "A Stranger" } }),
    );
    // Same phone, different email.
    const byPhone = await POST(
      applicationRequest({ ip: "198.51.100.42", fields: { email: "stranger@example.com", name: "A Stranger" } }),
    );

    for (const response of [byEmail, byPhone]) {
      expect(response.status).toBe(409);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    const emailBody = await byEmail.json();
    const phoneBody = await byPhone.json();
    expect(emailBody).toEqual(phoneBody);
    expect(Object.keys(emailBody).sort()).toEqual(["error", "reapplyFrom"]);
    expect(emailBody.error).toBe("already_applied");
    expect(emailBody.reapplyFrom).toBe(reapplyFrom(original!.createdAt));

    // Nothing about the stored application leaks, changes, or gains a second file.
    expect(JSON.stringify(emailBody)).not.toContain("ayesha");
    expect(JSON.stringify(emailBody)).not.toContain("0300");
    expect(JSON.stringify(await CareerApplication.findOne({ email: "ayesha@example.com" }).lean())).toBe(stored);
    expect(await CareerApplication.countDocuments({})).toBe(1);
    expect(store.keys()).toHaveLength(1);
  });

  it("lets the person apply again once their earlier application is soft-deleted", async () => {
    await POST(applicationRequest({ ip: "198.51.100.43" }));
    const earlier = await CareerApplication.findOne({ email: "ayesha@example.com" });
    await CareerApplication.softDeleteById(earlier!._id);

    const again = await POST(applicationRequest({ ip: "198.51.100.44" }));
    expect(again.status).toBe(200);
    expect(await CareerApplication.countDocuments({ email: "ayesha@example.com" })).toBe(1);
  });

  it("answers 503 try_again when an identity lock stays held, and saves nothing", async () => {
    await CareerApplicationLock.collection.insertOne({
      _id: lockKey("email", "ayesha@example.com") as never,
      owner: "another-request",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const response = await POST(applicationRequest({ ip: "198.51.100.45" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "try_again" });
    expect(await CareerApplication.collection.countDocuments({})).toBe(0);
    expect(store.keys()).toEqual([]);
  });
  it("answers 429 with Retry-After on the 6th submission in 10 minutes, per address", async () => {
    const ip = "198.51.100.31";
    for (let i = 0; i < 5; i++) {
      const response = await POST(applicationRequest({ ip, fields: { email: `rl${i}@example.com`, phone: `0300000010${i}` } }));
      expect(response.status).toBe(200);
    }
    const sixth = await POST(applicationRequest({ ip, fields: { email: "rl5@example.com", phone: "03000000105" } }));
    expect(sixth.status).toBe(429);
    expect(Number(sixth.headers.get("retry-after"))).toBeGreaterThan(0);
    // Another address has its own count.
    const other = await POST(applicationRequest({ ip: "198.51.100.32" }));
    expect(other.status).toBe(200);
  });

  it("answers 429 on the 11th upload in 24 hours and stores no new file", async () => {
    const { Throttle } = await import("@/models/throttle");
    const ip = "198.51.100.33";
    for (let i = 0; i < 10; i++) {
      // Invalid fields: nothing is saved, but the upload still counts.
      await Throttle.deleteMany({ key: `form:careers:ip:${ip}` });
      const response = await POST(applicationRequest({ ip, fields: { name: "" } }));
      expect(response.status).toBe(400);
    }
    await Throttle.deleteMany({ key: `form:careers:ip:${ip}` });
    const eleventh = await POST(applicationRequest({ ip }));
    expect(eleventh.status).toBe(429);
    expect(Number(eleventh.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(store.keys()).toEqual([]);
    expect(await CareerApplication.collection.countDocuments({})).toBe(0);
  });

  it("does not count a request without a file against the upload budget", async () => {
    const { Throttle } = await import("@/models/throttle");
    const ip = "198.51.100.34";
    await POST(applicationRequest({ ip, files: [] }));
    expect(await Throttle.findOne({ key: `form:careers-upload:ip:${ip}` })).toBeNull();
  });
});
