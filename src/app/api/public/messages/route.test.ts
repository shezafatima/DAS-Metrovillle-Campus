// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import { describeWithDb } from "@/test/db";
import { Message } from "@/models/message";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ali Khan",
    email: "ali@example.com",
    phone: "",
    subject: "Admission for class 3",
    message: "Assalam o Alaikum, what are the fees for class 3?",
    ...overrides,
  };
}

function postRequest(body: unknown, ip = "203.0.113.100", extraHeaders: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/public/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...extraHeaders },
    body: JSON.stringify(body),
  });
}

describeWithDb("POST /api/public/messages", ["messages", "throttles"], () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/messages/mutations");
  });

  it("stores a valid submission without a phone", async () => {
    const { POST } = await import("./route");
    const response = await POST(postRequest(validBody(), "203.0.113.101"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });

    const doc = await Message.findOne({ email: "ali@example.com" });
    expect(doc).not.toBeNull();
    expect(doc!.phone).toBeNull();
  });

  it("normalises a provided phone to E.164", async () => {
    const { POST } = await import("./route");
    const response = await POST(postRequest(validBody({ phone: "0300-1234567" }), "203.0.113.102"));
    expect(response.status).toBe(200);
    const doc = await Message.findOne({ email: "ali@example.com" });
    expect(doc!.phone).toBe("+923001234567");
  });

  it("returns 400 naming exactly the invalid fields", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      postRequest(
        { name: "", email: "not-an-email", subject: "", message: "", phone: "12345" },
        "203.0.113.103",
      ),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("validation");
    expect(Object.keys(body.fields).sort()).toEqual(["email", "message", "name", "phone", "subject"]);
  });

  it("returns 400 for a non-JSON body", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/public/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.104" },
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 503 when storing the submission fails", async () => {
    vi.doMock("@/lib/messages/mutations", () => ({
      createMessage: async () => {
        throw new Error("boom");
      },
    }));
    vi.resetModules();
    const { POST } = await import("./route");
    const response = await POST(postRequest(validBody(), "203.0.113.105"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "unavailable" });
  });

  it("two valid posts from the same email (different casing) produce two documents", async () => {
    const { POST } = await import("./route");
    await POST(postRequest(validBody({ email: "dup@example.com" }), "203.0.113.106"));
    await POST(postRequest(validBody({ email: "DUP@Example.com" }), "203.0.113.107"));
    const count = await Message.countDocuments({ email: "dup@example.com" });
    expect(count).toBe(2);
  });

  it("discards a honeypot submission with the same success shape, stores nothing and does not throttle", async () => {
    const { POST } = await import("./route");
    const ip = "203.0.113.108";
    const response = await POST(postRequest({ ...validBody(), website_url: "x" }, ip));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const count = await Message.countDocuments({ email: "ali@example.com" });
    expect(count).toBe(0);

    const { Throttle } = await import("@/models/throttle");
    const throttled = await Throttle.findOne({ key: `form:contact:ip:${ip}` });
    expect(throttled).toBeNull();
  });

  it("allows 5 submissions per source then refuses the 6th with Retry-After", async () => {
    const { POST } = await import("./route");
    const ip = "203.0.113.109";

    for (let i = 0; i < 5; i++) {
      const response = await POST(postRequest(validBody({ email: `rate-${i}@example.com` }), ip));
      expect(response.status).toBe(200);
    }

    const sixth = await POST(postRequest(validBody({ email: "rate-5@example.com" }), ip));
    expect(sixth.status).toBe(429);
    const retryAfter = Number(sixth.headers.get("retry-after"));
    expect(Number.isFinite(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);

    const count = await Message.countDocuments({ email: { $regex: /^rate-\d@example\.com$/ } });
    expect(count).toBe(5);
  });

  it("a contact budget is separate from the careers form budget on the same source", async () => {
    const { POST: postMessage } = await import("@/app/api/public/messages/route");
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const ip = "203.0.113.110";

    for (let i = 0; i < 6; i++) {
      await checkRateLimit({ key: `form:careers:ip:${ip}`, max: 5, windowSeconds: 600 });
    }
    expect((await checkRateLimit({ key: `form:careers:ip:${ip}`, max: 5, windowSeconds: 600 })).allowed).toBe(false);

    const contactResponse = await postMessage(postRequest(validBody({ email: "after-careers@example.com" }), ip));
    expect(contactResponse.status).toBe(200);
  });

  it("returns 413 when Content-Length exceeds 64 KiB", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/public/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.111", "content-length": "70000" },
      body: JSON.stringify(validBody()),
    });
    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "too_large" });
  });

  it("rejects a 5,001-character message and accepts exactly 5,000", async () => {
    const { POST } = await import("./route");
    const tooLong = await POST(
      postRequest(validBody({ email: "long1@example.com", message: "x".repeat(5001) }), "203.0.113.112"),
    );
    expect(tooLong.status).toBe(400);
    const body = await tooLong.json();
    expect(body.fields.message).toBe("Message must be 5,000 characters or fewer.");

    const exact = await POST(
      postRequest(validBody({ email: "long2@example.com", message: "x".repeat(5000) }), "203.0.113.113"),
    );
    expect(exact.status).toBe(200);
  });
});
