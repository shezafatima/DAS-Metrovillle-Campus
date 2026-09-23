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

describeWithDb("POST /api/public/signups", ["signups", "throttle"], () => {
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
