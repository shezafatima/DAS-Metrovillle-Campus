import { test, expect } from "@playwright/test";

test.describe("shared building blocks (US6)", () => {
  test("the health check reports ok with no cache", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });

  test("the sign-up API route is always refused, independent of any lockout state", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/sign-up/email", {
      data: {
        email: "another-attempt@example.com",
        password: "another-password-12345",
        name: "Nope",
      },
    });
    expect(response.status()).toBe(400);
  });
});
