// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import { describeWithDb } from "@/test/db";
import { Signup } from "@/models/signup";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ali Khan",
    email: "ali@example.com",
    phone: "03001234567",
    source: "home",
    ...overrides,
  };
}

function postRequest(body: unknown, ip = "203.0.113.1"): Request {
  return new Request("http://localhost/api/public/signups", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describeWithDb("POST /api/public/signups", ["signups", "throttles"], () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/signup/mutations");
  });

  it("stores a valid submission and returns an identical-shaped success", async () => {
    const { POST } = await import("./route");
    const response = await POST(postRequest(validBody(), "203.0.113.10"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual({ ok: true });

    const doc = await Signup.findOne({ email: "ali@example.com" });
    expect(doc).not.toBeNull();
    expect(doc!.phone).toBe("+923001234567");
    expect(doc!.sources).toEqual(["home"]);
  });

  it("returns 400 naming exactly the invalid fields", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      postRequest(
        { name: "", email: "not-an-email", phone: "021-12345678", source: "admission" },
        "203.0.113.11",
      ),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("validation");
    expect(Object.keys(body.fields).sort()).toEqual(["email", "name", "phone", "source"]);
  });

  it("returns 400 for a missing name only", async () => {
    const { POST } = await import("./route");
    const withoutName = { email: "ali@example.com", phone: "03001234567", source: "home" };
    const response = await POST(postRequest(withoutName, "203.0.113.12"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(Object.keys(body.fields)).toEqual(["name"]);
  });

  it("returns 400 for a non-JSON body", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/public/signups", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.13" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns an identical response for a new email and a repeat of it (SC-004, spec US2 scenario 4)", async () => {
    const { POST } = await import("./route");

    const first = await POST(postRequest(validBody({ email: "identical@example.com" }), "203.0.113.20"));
    const firstText = await first.text();

    const second = await POST(
      postRequest(
        validBody({ email: "Identical@Example.COM", name: "Different Name" }),
        "203.0.113.21",
      ),
    );
    const secondText = await second.text();

    expect(second.status).toBe(first.status);
    expect(secondText).toBe(firstText);
    for (const [key, value] of first.headers.entries()) {
      if (key === "date") continue;
      expect(second.headers.get(key)).toBe(value);
    }

    const count = await Signup.countDocuments({ email: "identical@example.com" });
    expect(count).toBe(1);
  });

  it("discards a honeypot submission with the same success shape and stores nothing (FR-025)", async () => {
    const { POST } = await import("./route");

    const validResponse = await POST(postRequest(validBody({ email: "control@example.com" }), "203.0.113.30"));
    const validText = await validResponse.text();

    const spamResponse = await POST(
      postRequest({ ...validBody({ email: "spam@example.com" }), website_url: "http://spam.example" }, "203.0.113.31"),
    );
    const spamText = await spamResponse.text();

    expect(spamResponse.status).toBe(validResponse.status);
    expect(spamText).toBe(validText);

    const count = await Signup.countDocuments({ email: "spam@example.com" }).setOptions({ withDeleted: true });
    expect(count).toBe(0);
  });

  it("allows 5 submissions per source then refuses the 6th with Retry-After; a different source still succeeds", async () => {
    const { POST } = await import("./route");
    const ip = "203.0.113.40";

    for (let i = 0; i < 5; i++) {
      const response = await POST(postRequest(validBody({ email: `rate-${i}@example.com` }), ip));
      expect(response.status).toBe(200);
    }

    const sixth = await POST(postRequest(validBody({ email: "rate-5@example.com" }), ip));
    expect(sixth.status).toBe(429);
    expect(await sixth.json()).toEqual({ error: "too_many_requests" });
    const retryAfter = Number(sixth.headers.get("retry-after"));
    expect(Number.isFinite(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);

    const sixthCount = await Signup.countDocuments({ email: "rate-5@example.com" });
    expect(sixthCount).toBe(0);
    const priorCount = await Signup.countDocuments({ email: { $regex: /^rate-\d@example\.com$/ } });
    expect(priorCount).toBe(5);

    const otherSource = await POST(postRequest(validBody({ email: "other-source@example.com" }), "203.0.113.41"));
    expect(otherSource.status).toBe(200);
  });

  it("returns 503 when storing the submission fails", async () => {
    vi.doMock("@/lib/signup/mutations", () => ({
      upsertSignup: async () => {
        throw new Error("boom");
      },
    }));
    vi.resetModules();
    const { POST } = await import("./route");

    const response = await POST(postRequest(validBody(), "203.0.113.14"));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ error: "unavailable" });
  });
});
