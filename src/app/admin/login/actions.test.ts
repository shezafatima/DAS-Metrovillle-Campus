// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { APIError } from "better-auth/api";

const signInEmailMock = vi.fn();
const redirectMock = vi.fn((url: string) => {
  throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}` });
});
const logSecurityEventMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuth: async () => ({ api: { signInEmail: (...args: unknown[]) => signInEmailMock(...args) } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));
vi.mock("@/lib/log", () => ({
  logSecurityEvent: (...args: unknown[]) => logSecurityEventMock(...args),
}));

const { login } = await import("./actions");

function formDataFor(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

describe("login action", () => {
  beforeEach(() => {
    signInEmailMock.mockReset();
    redirectMock.mockClear();
    logSecurityEventMock.mockClear();
  });

  it("returns 'generic' on a 401 APIError", async () => {
    signInEmailMock.mockRejectedValue(new APIError("UNAUTHORIZED", { message: "nope" }));
    const result = await login(
      { error: null },
      formDataFor({ email: "admin@example.com", password: "wrong-password" }),
    );
    expect(result).toEqual({ error: "generic" });
  });

  it("returns 'blocked' on a 429 APIError", async () => {
    signInEmailMock.mockRejectedValue(new APIError("TOO_MANY_REQUESTS", { message: "slow down" }));
    const result = await login(
      { error: null },
      formDataFor({ email: "admin@example.com", password: "whatever" }),
    );
    expect(result).toEqual({ error: "blocked" });
  });

  it("returns 'unavailable' and never leaks the underlying error text", async () => {
    signInEmailMock.mockRejectedValue(
      new Error("connect ECONNREFUSED mongodb+srv://user:secret@cluster.mongodb.net"),
    );
    const result = await login(
      { error: null },
      formDataFor({ email: "admin@example.com", password: "whatever" }),
    );
    expect(result).toEqual({ error: "unavailable" });
    expect(JSON.stringify(result)).not.toContain("mongodb+srv");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("returns 'generic' without calling signInEmail when the honeypot is filled", async () => {
    const result = await login(
      { error: null },
      formDataFor({ email: "admin@example.com", password: "whatever", website_url: "http://spam.example" }),
    );
    expect(result).toEqual({ error: "generic" });
    expect(signInEmailMock).not.toHaveBeenCalled();
  });

  it("redirects to /admin for an unsafe next value", async () => {
    signInEmailMock.mockResolvedValue({});
    await expect(
      login(
        { error: null },
        formDataFor({ email: "admin@example.com", password: "correct", next: "https://evil.com" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("redirects to the requested admin page for a safe next value", async () => {
    signInEmailMock.mockResolvedValue({});
    await expect(
      login(
        { error: null },
        formDataFor({ email: "admin@example.com", password: "correct", next: "/admin/news" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/admin/news");
  });
});
