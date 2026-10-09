// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const headersMock = vi.fn();
const cookiesMock = vi.fn();
const getSessionMock = vi.fn();
const redirectMock = vi.fn();
const logMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: () => headersMock(),
  cookies: () => cookiesMock(),
}));
vi.mock("next/navigation", () => ({
  // Like Next's redirect(), never returns: it throws.
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/auth", () => ({
  getAuth: async () => ({ api: { getSession: getSessionMock } }),
}));
vi.mock("@/lib/log", () => ({ logSecurityEvent: (event: unknown) => logMock(event) }));

function cookieStore(entries: Array<[string, string]>) {
  return { getAll: () => entries.map(([name, value]) => ({ name, value })) };
}

function betterAuthResult(userOverrides: Record<string, unknown> = {}) {
  return {
    session: { id: "s1" },
    user: { id: "u1", email: "admin@example.com", role: "main_admin", permissions: [], ...userOverrides },
  };
}

function setupRequest(pathname = "/admin/news") {
  headersMock.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=T", "x-pathname": pathname }));
  cookiesMock.mockResolvedValue(cookieStore([["better-auth.session_token", "T"]]));
}

beforeEach(() => {
  headersMock.mockReset();
  cookiesMock.mockReset();
  getSessionMock.mockReset();
  redirectMock.mockReset();
  logMock.mockReset();
});

describe("getAuthRequestHeaders", () => {
  it("rebuilds the cookie header from cookies(), which is current after a Server Action sets one", async () => {
    // The 010 I1 spike: in an action's re-render, headers() still has the
    // OLD cookie while cookies() already has the NEW one.
    headersMock.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=OLD" }));
    cookiesMock.mockResolvedValue(cookieStore([["better-auth.session_token", "NEW"]]));

    const { getAuthRequestHeaders } = await import("@/lib/dal");
    const result = await getAuthRequestHeaders();
    expect(result.get("cookie")).toBe("better-auth.session_token=NEW");
  });

  it("keeps every other request header", async () => {
    headersMock.mockResolvedValue(
      new Headers({
        cookie: "a=1",
        "x-forwarded-for": "203.0.113.9",
        "user-agent": "test-agent",
        "x-pathname": "/admin/account",
      }),
    );
    cookiesMock.mockResolvedValue(cookieStore([["a", "1"], ["b", "2"]]));

    const { getAuthRequestHeaders } = await import("@/lib/dal");
    const result = await getAuthRequestHeaders();
    expect(result.get("x-forwarded-for")).toBe("203.0.113.9");
    expect(result.get("user-agent")).toBe("test-agent");
    expect(result.get("x-pathname")).toBe("/admin/account");
    expect(result.get("cookie")).toBe("a=1; b=2");
  });

  it("drops the cookie header when there are no cookies", async () => {
    headersMock.mockResolvedValue(new Headers({ cookie: "stale=1", "user-agent": "x" }));
    cookiesMock.mockResolvedValue(cookieStore([]));

    const { getAuthRequestHeaders } = await import("@/lib/dal");
    const result = await getAuthRequestHeaders();
    expect(result.has("cookie")).toBe(false);
    expect(result.get("user-agent")).toBe("x");
  });
});

describe("getAdminSession", () => {
  it("looks the session up with those rebuilt headers", async () => {
    headersMock.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=OLD" }));
    cookiesMock.mockResolvedValue(cookieStore([["better-auth.session_token", "NEW"]]));
    getSessionMock.mockResolvedValue(betterAuthResult());

    const { getAdminSession } = await import("@/lib/dal");
    await getAdminSession();

    const passed = getSessionMock.mock.calls[0][0].headers as Headers;
    expect(passed.get("cookie")).toBe("better-auth.session_token=NEW");
  });

  it("maps role and permissions", async () => {
    setupRequest();
    getSessionMock.mockResolvedValue(
      betterAuthResult({
        role: "content_manager",
        permissions: ["messages", "news", "news", "users", "bogus"],
      }),
    );

    const { getAdminSession } = await import("@/lib/dal");
    expect(await getAdminSession()).toEqual({
      email: "admin@example.com",
      sessionId: "s1",
      userId: "u1",
      role: "content_manager",
      permissions: ["news", "messages"],
    });
  });

  it("defaults a missing or unknown role to content_manager with no grants (least privilege)", async () => {
    setupRequest();
    getSessionMock.mockResolvedValue(betterAuthResult({ role: undefined, permissions: undefined }));
    const { getAdminSession } = await import("@/lib/dal");
    const session = await getAdminSession();
    expect(session?.role).toBe("content_manager");
    expect(session?.permissions).toEqual([]);

    getSessionMock.mockResolvedValue(betterAuthResult({ role: "superuser" }));
    expect((await getAdminSession())?.role).toBe("content_manager");
  });

  it("returns null when there is no session", async () => {
    setupRequest();
    getSessionMock.mockResolvedValue(null);
    const { getAdminSession } = await import("@/lib/dal");
    expect(await getAdminSession()).toBeNull();
  });

  it("returns null for a disabled or deleted account (FR-012)", async () => {
    setupRequest();
    const { getAdminSession } = await import("@/lib/dal");

    getSessionMock.mockResolvedValue(betterAuthResult({ disabledAt: new Date() }));
    expect(await getAdminSession()).toBeNull();

    getSessionMock.mockResolvedValue(betterAuthResult({ deletedAt: new Date() }));
    expect(await getAdminSession()).toBeNull();
  });
});

describe("decideAccess", () => {
  const admin = {
    email: "a@x.test",
    sessionId: "s",
    userId: "u",
    role: "main_admin" as const,
    permissions: [],
  };
  const manager = { ...admin, role: "content_manager" as const, permissions: ["news" as const] };

  it("no session → unauthorized", async () => {
    const { decideAccess } = await import("@/lib/dal");
    expect(decideAccess(null, "news")).toBe("unauthorized");
    expect(decideAccess(null, "any")).toBe("unauthorized");
  });

  it("missing permission or wrong role → forbidden; correct → null", async () => {
    const { decideAccess } = await import("@/lib/dal");
    expect(decideAccess(manager, "messages")).toBe("forbidden");
    expect(decideAccess(manager, "main_admin")).toBe("forbidden");
    expect(decideAccess(manager, "news")).toBeNull();
    expect(decideAccess(manager, "any")).toBeNull();
    expect(decideAccess(admin, "main_admin")).toBeNull();
    expect(decideAccess(admin, "messages")).toBeNull();
  });
});

describe("requireAdminPage", () => {
  it("redirects to login, carrying the current path, when there is no session", async () => {
    setupRequest("/admin/news?page=2");
    getSessionMock.mockResolvedValue(null);
    const { requireAdminPage } = await import("@/lib/dal");
    await expect(requireAdminPage("news")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/admin/login?next=%2Fadmin%2Fnews%3Fpage%3D2");
  });

  it("redirects a forbidden user to the overview with the denied flag, and logs it", async () => {
    setupRequest("/admin/messages");
    getSessionMock.mockResolvedValue(betterAuthResult({ role: "content_manager", permissions: ["news"] }));
    const { requireAdminPage } = await import("@/lib/dal");
    await expect(requireAdminPage("messages")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/admin?denied=1");
    expect(logMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "access_denied", email: "admin@example.com", access: "messages", outcome: "/admin/messages" }),
    );
  });

  it("returns the session when allowed", async () => {
    setupRequest();
    getSessionMock.mockResolvedValue(betterAuthResult({ role: "content_manager", permissions: ["news"] }));
    const { requireAdminPage } = await import("@/lib/dal");
    const session = await requireAdminPage("news");
    expect(session.userId).toBe("u1");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("requireAdminAccess", () => {
  it("returns unauthorized without logging when there is no session", async () => {
    setupRequest();
    getSessionMock.mockResolvedValue(null);
    const { requireAdminAccess } = await import("@/lib/dal");
    expect(await requireAdminAccess("news")).toEqual({ ok: false, reason: "unauthorized" });
    expect(logMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns forbidden without redirecting, and logs it", async () => {
    setupRequest("/api/admin/messages/1");
    const { requireAdminAccess } = await import("@/lib/dal");

    getSessionMock.mockResolvedValue(betterAuthResult({ role: "content_manager", permissions: [] }));
    expect(await requireAdminAccess("messages")).toEqual({ ok: false, reason: "forbidden" });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledTimes(1);
  });

  it("a content manager is refused a main-admin-only action even holding every grant (password changes stay with the main admin)", async () => {
    setupRequest("/admin/account");
    getSessionMock.mockResolvedValue(
      betterAuthResult({ role: "content_manager", permissions: ["news", "messages", "careers", "settings", "pages"] }),
    );
    const { requireAdminAccess } = await import("@/lib/dal");
    expect(await requireAdminAccess("main_admin")).toEqual({ ok: false, reason: "forbidden" });
  });

  it("returns the session when allowed", async () => {
    setupRequest();
    getSessionMock.mockResolvedValue(betterAuthResult());
    const { requireAdminAccess } = await import("@/lib/dal");
    const result = await requireAdminAccess("main_admin");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.role).toBe("main_admin");
  });
});
