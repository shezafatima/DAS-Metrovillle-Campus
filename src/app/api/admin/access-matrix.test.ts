// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { getTestSessionCookie, seedTestAdmin, seedTestContentManager } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";
import { PERMISSION_KEYS, type Access, type Permission } from "@/lib/permissions";

/**
 * The three access cases (Constitution XI) for every admin route handler,
 * driven from one table that mirrors specs/011-roles-and-users/contracts/
 * access-matrix.md — real Better Auth sessions, real database:
 *
 *   1. no session                         → 401 unauthorized
 *   2. wrong role / missing permission    → 403 (and no section data)
 *      (for "any" routes no role can be wrong, so the second case is an
 *      account disabled while holding a live cookie: also a 401, below)
 *   3. correct permission                 → not refused (any status but 401/403)
 *
 * src/test/access-inventory.test.ts makes sure this table cannot fall
 * behind the routes on disk.
 */
type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
type Loader = () => Promise<Record<string, Handler | undefined>>;

interface RouteCase {
  name: string;
  load: Loader;
  method: string;
  access: Access;
  body?: unknown;
}

// The first case pays for a cold module load, the unique-index creation and a
// scrypt hash over a remote database; later ones are fast.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const UNKNOWN_ID = "507f1f77bcf86cd799439011";

const routes: RouteCase[] = [
  { name: "POST /api/admin/news", load: () => import("@/app/api/admin/news/route") as never, method: "POST", access: "news", body: {} },
  { name: "GET /api/admin/news/[id]", load: () => import("@/app/api/admin/news/[id]/route") as never, method: "GET", access: "news" },
  { name: "PUT /api/admin/news/[id]", load: () => import("@/app/api/admin/news/[id]/route") as never, method: "PUT", access: "news", body: {} },
  { name: "DELETE /api/admin/news/[id]", load: () => import("@/app/api/admin/news/[id]/route") as never, method: "DELETE", access: "news" },
  { name: "POST /api/admin/news/[id]/publish", load: () => import("@/app/api/admin/news/[id]/publish/route") as never, method: "POST", access: "news" },
  { name: "POST /api/admin/news/[id]/unpublish", load: () => import("@/app/api/admin/news/[id]/unpublish/route") as never, method: "POST", access: "news" },
  { name: "POST /api/admin/uploads/sign", load: () => import("@/app/api/admin/uploads/sign/route") as never, method: "POST", access: "news", body: { kind: "nope" } },
  // 005: an unknown kind keeps the "correct permission" case from signing anything (it ends in a 400, not 401/403).
  { name: "POST /api/admin/settings/uploads/sign", load: () => import("@/app/api/admin/settings/uploads/sign/route") as never, method: "POST", access: "settings", body: { kind: "nope" } },
  { name: "PATCH /api/admin/messages/[id]", load: () => import("@/app/api/admin/messages/[id]/route") as never, method: "PATCH", access: "messages", body: {} },
  { name: "DELETE /api/admin/messages/[id]", load: () => import("@/app/api/admin/messages/[id]/route") as never, method: "DELETE", access: "messages" },
  { name: "POST /api/admin/messages/[id]/read", load: () => import("@/app/api/admin/messages/[id]/read/route") as never, method: "POST", access: "messages" },
  { name: "DELETE /api/admin/signups/[id]", load: () => import("@/app/api/admin/signups/[id]/route") as never, method: "DELETE", access: "careers" },
  { name: "POST /api/admin/signups/opened", load: () => import("@/app/api/admin/signups/opened/route") as never, method: "POST", access: "careers" },
  { name: "GET /api/admin/signups/export", load: () => import("@/app/api/admin/signups/export/route") as never, method: "GET", access: "careers" },
  // 012 careers: an unknown id ends in a 404, not 401/403, so case 3 never touches the document store.
  { name: "GET /api/admin/careers/[id]/cv", load: () => import("@/app/api/admin/careers/[id]/cv/route") as never, method: "GET", access: "careers" },
  { name: "GET /api/admin/session", load: () => import("@/app/api/admin/session/route") as never, method: "GET", access: "any" },
  { name: "GET /api/admin/notifications", load: () => import("@/app/api/admin/notifications/route") as never, method: "GET", access: "any" },
  { name: "POST /api/admin/notifications/read", load: () => import("@/app/api/admin/notifications/read/route") as never, method: "POST", access: "any" },
];

const EMAIL = "access-matrix@example.test";
const PASSWORD = "correct-horse-battery-staple";

async function call(route: RouteCase, cookie: string | null): Promise<Response> {
  vi.doMock("next/headers", () => mockNextHeaders(new Headers(cookie ? { cookie } : {})));
  vi.resetModules();
  const mod = await route.load();
  const handler = mod[route.method];
  if (!handler) throw new Error(`${route.name}: no ${route.method} export`);
  const request = new Request("http://localhost/api/admin/x", {
    method: route.method,
    headers: { "content-type": "application/json" },
    body: route.body === undefined ? undefined : JSON.stringify(route.body),
  });
  return handler(request, { params: Promise.resolve({ id: UNKNOWN_ID }) });
}

function allExcept(key: Permission): Permission[] {
  return PERMISSION_KEYS.filter((k) => k !== key);
}

describeWithDb("admin route access matrix (three cases per route)", ["user", "account", "session", "messages", "signups", "news", "careerApplications"], () => {
  beforeEach(() => {
    vi.doUnmock("next/headers");
    vi.resetModules();
  });

  describe.each(routes)("$name", (route) => {
    it("1. no session → 401 unauthorized, no-store", async () => {
      const response = await call(route, null);
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ error: "unauthorized" });
    });

    if (route.access === "any") {
      it("3. a content manager with no grants is allowed", async () => {
        await seedTestContentManager(EMAIL, PASSWORD, []);
        const cookie = await getTestSessionCookie(EMAIL, PASSWORD);
        const response = await call(route, cookie);
        expect([401, 403]).not.toContain(response.status);
      });
    } else {
      it("2. a content manager holding every grant except the required one → 403 forbidden, no data", async () => {
        await seedTestContentManager(EMAIL, PASSWORD, allExcept(route.access as Permission));
        const cookie = await getTestSessionCookie(EMAIL, PASSWORD);
        const response = await call(route, cookie);
        expect(response.status).toBe(403);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(await response.json()).toEqual({ error: "forbidden" });
      });

      it("2b. a content manager with no grants at all → 403 forbidden", async () => {
        await seedTestContentManager(EMAIL, PASSWORD, []);
        const cookie = await getTestSessionCookie(EMAIL, PASSWORD);
        expect((await call(route, cookie)).status).toBe(403);
      });

      it("3. a content manager holding exactly the required grant → not refused", async () => {
        await seedTestContentManager(EMAIL, PASSWORD, [route.access as Permission]);
        const cookie = await getTestSessionCookie(EMAIL, PASSWORD);
        const response = await call(route, cookie);
        expect([401, 403]).not.toContain(response.status);
      });

      it("3b. a main admin is not refused either", async () => {
        await seedTestAdmin(EMAIL, PASSWORD);
        const cookie = await getTestSessionCookie(EMAIL, PASSWORD);
        expect([401, 403]).not.toContain((await call(route, cookie)).status);
      });
    }

    it("a disabled account holding a valid session cookie is treated as no session (FR-012)", async () => {
      await seedTestAdmin(EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(EMAIL, PASSWORD);
      await seedTestAdmin(EMAIL, PASSWORD, { disabledAt: new Date() });
      const response = await call(route, cookie);
      expect(response.status).toBe(401);
    });
  });
});
