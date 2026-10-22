// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { StudentRegistration } from "@/models/student-registration";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const afterMock = vi.hoisted(() => vi.fn());
vi.mock("next/server", () => ({ after: afterMock, connection: async () => undefined }));

const availability = vi.hoisted(() => ({
  value: { open: true, classes: ["Playgroup", "Nursery", "Class 1"], closedMessage: "", today: "2027-03-10", now: new Date("2027-03-10T06:00:00Z") },
  throws: false,
}));
vi.mock("@/lib/registration/availability", () => ({
  getRegistrationAvailability: async () => {
    if (availability.throws) throw new Error("PeanutAllergyMarker boom");
    return availability.value;
  },
}));

const rateLimit = vi.hoisted(() => ({ throws: false }));
vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...original,
    checkRateLimit: (...args: Parameters<typeof original.checkRateLimit>) => {
      if (rateLimit.throws) throw new Error("Zartasha Testchild db down");
      return original.checkRateLimit(...args);
    },
  };
});

const { POST } = await import("./route");

const VALID = {
  studentName: "Zartasha Testchild",
  fatherName: "Imran Testfather",
  motherName: "Sana Testmother",
  email: "parent@example.com",
  dateOfBirth: "2020-05-01",
  fatherMobile: "03001234567",
  motherMobile: "",
  address: "House 12, Street 4, Metroville",
  emergencyPhone: "03011234567",
  className: "Class 1",
  motherTongue: "urdu",
  motherTongueOther: "",
  vaccinated: "yes",
  medicalHistory: "PeanutAllergyMarker",
  referenceName: "",
  referenceClass: "",
  referenceRelation: "",
  remarks: "",
  consent: true,
};

const SEEDED = ["Zartasha", "Testfather", "Testmother", "parent@example", "03001234567", "923001234567", "Metroville", "2020-05-01", "PeanutAllergyMarker", "Testuncle"];

let ipCounter = 0;
function request(body: unknown, { ip, raw }: { ip?: string; raw?: string } = {}): Request {
  return new Request("http://localhost/api/public/registrations", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip ?? `198.51.100.${(ipCounter += 1)}` },
    body: raw ?? JSON.stringify(body),
  });
}

function assertNoSeededValue(text: string) {
  for (const value of SEEDED) expect(text, value).not.toContain(value);
}

describeWithDb("POST /api/public/registrations", ["studentRegistrations", "throttles"], () => {
  let logged: string[];

  beforeEach(() => {
    availability.value = { open: true, classes: ["Playgroup", "Nursery", "Class 1"], closedMessage: "", today: "2027-03-10", now: new Date("2027-03-10T06:00:00Z") };
    availability.throws = false;
    rateLimit.throws = false;
    afterMock.mockReset();
    logged = [];
    for (const method of ["log", "info", "warn", "error"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(" "));
      });
    }
  });

  it("stores a valid registration and answers with an 8-character reference", async () => {
    const response = await POST(request(VALID));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.reference).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
    expect(await StudentRegistration.countDocuments({})).toBe(1);
    const doc = await StudentRegistration.findOne({ reference: body.reference }).lean();
    expect(doc?.fatherMobile).toBe("+923001234567");
    expect(afterMock).toHaveBeenCalledTimes(1);
    assertNoSeededValue(logged.join("\n"));
  });

  it("400 with field errors and nothing stored, echoing no value", async () => {
    const response = await POST(request({ ...VALID, studentName: "", email: "nope" }));
    expect(response.status).toBe(400);
    const text = await response.text();
    const body = JSON.parse(text);
    expect(body.error).toBe("validation");
    expect(Object.keys(body.fields)).toEqual(expect.arrayContaining(["studentName", "email"]));
    assertNoSeededValue(text);
    expect(await StudentRegistration.countDocuments({})).toBe(0);
  });

  it("400 for a class not in the current list", async () => {
    const response = await POST(request({ ...VALID, className: "Class 9" }));
    expect(response.status).toBe(400);
    expect((await response.json()).fields.className).toBeDefined();
  });

  it("413 over 64 KiB", async () => {
    const req = new Request("http://localhost/api/public/registrations", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "70000" },
      body: "{}",
    });
    expect((await POST(req)).status).toBe(413);
  });

  it("400 for non-object JSON and unparseable bodies", async () => {
    expect((await POST(request(null, { raw: "[1,2]" }))).status).toBe(400);
    expect((await POST(request(null, { raw: "not json" }))).status).toBe(400);
    expect((await POST(request(null, { raw: '"text"' }))).status).toBe(400);
  });

  it("403 when closed, even with an invalid body, and stores nothing", async () => {
    availability.value = { ...availability.value, open: false };
    for (const body of [VALID, {}]) {
      const response = await POST(request(body));
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "closed", message: "Admissions are closed. Please check the Admission page for dates." });
    }
    expect(await StudentRegistration.countDocuments({})).toBe(0);
  });

  it("503 when the insert fails, with no value in the response or logs", async () => {
    const spy = vi.spyOn(StudentRegistration, "create").mockRejectedValueOnce(new Error("E11000 PeanutAllergyMarker Zartasha"));
    const response = await POST(request(VALID));
    spy.mockRestore();
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: "unavailable" });
    assertNoSeededValue(text);
    assertNoSeededValue(logged.join("\n"));
    expect(logged.join("\n")).toContain("registration_save_failed");
  });

  it("503 when the rate-limit or availability lookup throws, storing nothing and logging no value", async () => {
    rateLimit.throws = true;
    let response = await POST(request(VALID));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "unavailable" });
    rateLimit.throws = false;
    availability.throws = true;
    response = await POST(request(VALID));
    expect(response.status).toBe(503);
    expect(await StudentRegistration.countDocuments({})).toBe(0);
    assertNoSeededValue(logged.join("\n"));
  });

  it("honeypot: 200 with a reference and nothing stored", async () => {
    const response = await POST(request({ ...VALID, website_url: "http://spam.example" }));
    expect(response.status).toBe(200);
    expect((await response.json()).reference).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
    expect(await StudentRegistration.countDocuments({})).toBe(0);
  });

  it("the 6th submission from one address is 429 with Retry-After and nothing more is stored", async () => {
    const ip = "203.0.113.50";
    for (let i = 0; i < 5; i += 1) expect((await POST(request(VALID, { ip }))).status).toBe(200);
    const response = await POST(request(VALID, { ip }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(await StudentRegistration.countDocuments({})).toBe(5);
  });

  it("siblings sharing parents, email and phones are both stored", async () => {
    const first = await POST(request(VALID));
    const second = await POST(request({ ...VALID, studentName: "Younger Sibling", dateOfBirth: "2022-01-01" }));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await StudentRegistration.countDocuments({})).toBe(2);
  });

  it("ignores a submitted date, status and reference", async () => {
    const response = await POST(request({ ...VALID, createdAt: "2001-01-01", status: "admitted", reference: "AAAAAAAA" }));
    const { reference } = await response.json();
    expect(reference).not.toBe("AAAAAAAA");
    const doc = await StudentRegistration.findOne({ reference }).lean();
    expect(doc?.status).toBe("new");
    expect(doc?.createdAt.getFullYear()).toBeGreaterThan(2020);
  });
});
