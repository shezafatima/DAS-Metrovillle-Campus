// @vitest-environment node
import { describe, it, expect } from "vitest";
import { describeWithDb } from "@/test/db";
import { protectPublicForm, tooManyRequestsResponse } from "@/lib/public-form";

function requestFrom(ip: string): Request {
  return new Request("http://localhost:3000/api/public/contact", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describeWithDb("protectPublicForm", ["throttles"], () => {
  it("allows up to 5 calls then refuses the 6th with retryAfterSeconds > 0", async () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    const name = "test-form-a";
    for (let i = 0; i < 5; i++) {
      const result = await protectPublicForm(requestFrom(ip), { name });
      expect(result.kind).toBe("ok");
    }
    const sixth = await protectPublicForm(requestFrom(ip), { name });
    expect(sixth.kind).toBe("limited");
    if (sixth.kind === "limited") {
      expect(sixth.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("a different source address is unaffected by another source's limit", async () => {
    const name = "test-form-b";
    const ipA = "198.51.100.10";
    const ipB = "198.51.100.11";
    for (let i = 0; i < 5; i++) {
      await protectPublicForm(requestFrom(ipA), { name });
    }
    const resultForB = await protectPublicForm(requestFrom(ipB), { name });
    expect(resultForB.kind).toBe("ok");
  });

  it("a filled honeypot field is rejected without consuming a rate-limit slot", async () => {
    const ip = "198.51.100.20";
    const name = "test-form-c";
    const result = await protectPublicForm(requestFrom(ip), { name }, { website_url: "http://spam.example" });
    expect(result.kind).toBe("honeypot");

    // Five more real submissions should still all be allowed — the
    // honeypot hit didn't count against the limit.
    for (let i = 0; i < 5; i++) {
      const ok = await protectPublicForm(requestFrom(ip), { name });
      expect(ok.kind).toBe("ok");
    }
  });
});

describe("tooManyRequestsResponse", () => {
  it("returns 429 with Retry-After and only the error field", async () => {
    const response = tooManyRequestsResponse(42);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    const body = await response.json();
    expect(body).toEqual({ error: "too_many_requests" });
  });
});
