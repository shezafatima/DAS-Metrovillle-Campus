// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { describeWithDb } from "@/test/db";
import { getTestSessionCookie, seedTestAdmin, seedTestContentManager } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";
import { seedRegistration } from "@/test/registration-seed";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { RegistrationExport } from "@/models/registration-export";
import { StudentRegistration } from "@/models/student-registration";
import { AdminNotificationState } from "@/models/admin-notification-state";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const ADMIN = "registrations-admin@example.test";
const MANAGER = "registrations-manager@example.test";
const PASSWORD = "correct-horse-battery-staple";
const SEEDED = ["Zartasha Testchild", "PeanutAllergyMarker", "Testfather"];

type Ctx = { params: Promise<{ id: string }> };
const ctx = (id: string): Ctx => ({ params: Promise.resolve({ id }) });
const raw = (id: string) => StudentRegistration.collection.findOne({ _id: new Types.ObjectId(id) } as never);
const DAY = 86_400_000;

async function load<T>(path: () => Promise<unknown>, cookie: string): Promise<T> {
  vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
  vi.resetModules();
  return (await path()) as T;
}

describeWithDb(
  "admin registrations routes",
  ["studentRegistrations", "registrationExports", "adminNotificationStates", "user", "account", "session"],
  () => {
    let adminCookie: string;
    let managerCookie: string;
    let logged: string[];

    beforeEach(async () => {
      await seedTestAdmin(ADMIN, PASSWORD);
      await seedTestContentManager(MANAGER, PASSWORD, [...PERMISSION_KEYS]);
      adminCookie = await getTestSessionCookie(ADMIN, PASSWORD);
      managerCookie = await getTestSessionCookie(MANAGER, PASSWORD);
      logged = [];
      for (const method of ["log", "info", "warn", "error"] as const) {
        vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
          logged.push(args.map(String).join(" "));
        });
      }
    });

    const noSeededValue = (text: string) => {
      for (const value of SEEDED) expect(text).not.toContain(value);
    };

    describe("PATCH and DELETE /api/admin/registrations/[id]", () => {
      type Mod = {
        PATCH: (r: Request, c: Ctx) => Promise<Response>;
        DELETE: (r: Request, c: Ctx) => Promise<Response>;
      };
      const patch = (mod: Mod, id: string, body: unknown) =>
        mod.PATCH(new Request("http://localhost/x", { method: "PATCH", body: JSON.stringify(body) }), ctx(id));

      it("PATCH sets the status, 400 on a bad body, 404 on an unknown id", async () => {
        const id = await seedRegistration({ studentName: "Zartasha Testchild" });
        const mod = await load<Mod>(() => import("./[id]/route"), adminCookie);
        const ok = await patch(mod, id, { status: "contacted" });
        expect(ok.status).toBe(200);
        expect(await ok.json()).toEqual({ ok: true, status: "contacted" });
        expect((await raw(id))?.status).toBe("contacted");

        const bad = await patch(mod, id, { status: "bogus" });
        expect(bad.status).toBe(400);
        expect((await bad.json()).fields.status).toBeDefined();
        expect((await patch(mod, "507f1f77bcf86cd799439011", { status: "new" })).status).toBe(404);
        noSeededValue(logged.join("\n"));
      });

      it("DELETE soft-deletes (200) and a second call is 404", async () => {
        const id = await seedRegistration({ studentName: "Zartasha Testchild" });
        const mod = await load<Mod>(() => import("./[id]/route"), adminCookie);
        const first = await mod.DELETE(new Request("http://localhost/x", { method: "DELETE" }), ctx(id));
        expect(first.status).toBe(200);
        expect((await raw(id))?.deletedAt).toBeInstanceOf(Date);
        expect((await mod.DELETE(new Request("http://localhost/x", { method: "DELETE" }), ctx(id))).status).toBe(404);
        noSeededValue(logged.join("\n"));
      });

      it("a content manager with every permission gets 403 and nothing changes", async () => {
        const id = await seedRegistration();
        const mod = await load<Mod>(() => import("./[id]/route"), managerCookie);
        expect((await patch(mod, id, { status: "admitted" })).status).toBe(403);
        expect((await mod.DELETE(new Request("http://localhost/x", { method: "DELETE" }), ctx(id))).status).toBe(403);
        const doc = await raw(id);
        expect(doc?.status).toBe("new");
        expect(doc?.deletedAt).toBeNull();
      });
    });

    describe("POST /api/admin/registrations/[id]/restore", () => {
      type Mod = { POST: (r: Request, c: Ctx) => Promise<Response> };
      const post = (mod: Mod, id: string) => mod.POST(new Request("http://localhost/x", { method: "POST" }), ctx(id));

      it("restores within 30 days (200) and answers 404 not_restorable after", async () => {
        const fresh = await seedRegistration({ deletedAt: new Date(Date.now() - 2 * DAY) });
        const stale = await seedRegistration({ deletedAt: new Date(Date.now() - 31 * DAY) });
        const mod = await load<Mod>(() => import("./[id]/restore/route"), adminCookie);
        expect((await post(mod, fresh)).status).toBe(200);
        expect((await raw(fresh))?.deletedAt).toBeNull();
        const refused = await post(mod, stale);
        expect(refused.status).toBe(404);
        expect(await refused.json()).toEqual({ error: "not_restorable" });
      });

      it("a content manager with every permission gets 403 and it stays deleted", async () => {
        const id = await seedRegistration({ deletedAt: new Date(Date.now() - DAY) });
        const mod = await load<Mod>(() => import("./[id]/restore/route"), managerCookie);
        expect((await post(mod, id)).status).toBe(403);
        expect((await raw(id))?.deletedAt).toBeInstanceOf(Date);
      });
    });

    describe("GET /api/admin/registrations/export", () => {
      type Mod = { GET: (r: Request) => Promise<Response> };
      const get = (mod: Mod, query = "") => mod.GET(new Request(`http://localhost/api/admin/registrations/export${query}`));

      it("answers with a filtered attachment CSV and records one export without the search text", async () => {
        await seedRegistration({ studentName: "Zartasha Testchild", className: "Class 1", fatherName: "Imran Testfather" });
        await seedRegistration({ studentName: "Other Child", className: "Nursery" });
        await seedRegistration({ studentName: "Deleted Child", className: "Class 1", deletedAt: new Date() });
        const mod = await load<Mod>(() => import("./export/route"), adminCookie);
        const response = await get(mod, "?class=Class%201&q=Zartasha");

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
        expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="registrations-\d{4}-\d{2}-\d{2}\.csv"$/);
        expect(response.headers.get("cache-control")).toBe("no-store");
        const bytes = new Uint8Array(await response.arrayBuffer());
        expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
        const text = new TextDecoder().decode(bytes);
        expect(text.split("\r\n").filter(Boolean)).toHaveLength(2);
        expect(text).toContain("Zartasha Testchild");
        expect(text).not.toContain("Other Child");
        expect(text).not.toContain("Deleted Child");

        const exports = await RegistrationExport.find({}).lean();
        expect(exports).toHaveLength(1);
        expect(exports[0]).toMatchObject({ rows: 1, classFilter: "Class 1", searched: true, byEmail: ADMIN });
        expect(JSON.stringify(exports[0])).not.toContain("Zartasha");
        // The log line carries the count only, not the search text or any field.
        noSeededValue(logged.join("\n"));
        expect(logged.join("\n")).toContain("registration_exported");
      });

      it("a search with no match still downloads the header row and records rows: 0", async () => {
        const mod = await load<Mod>(() => import("./export/route"), adminCookie);
        const response = await get(mod, "?q=nobody");
        expect(response.status).toBe(200);
        expect((await response.text()).split("\r\n").filter(Boolean)).toHaveLength(1);
        expect(await RegistrationExport.findOne({}).lean()).toMatchObject({ rows: 0 });
      });

      it("a content manager with every permission gets 403 and no export record", async () => {
        await seedRegistration();
        const mod = await load<Mod>(() => import("./export/route"), managerCookie);
        expect((await get(mod)).status).toBe(403);
        expect(await RegistrationExport.countDocuments({})).toBe(0);
      });
    });

    describe("POST /api/admin/registrations/opened", () => {
      type Mod = { POST: () => Promise<Response> };

      it("marks the list opened for the caller", async () => {
        const mod = await load<Mod>(() => import("./opened/route"), adminCookie);
        const before = Date.now();
        const response = await mod.POST();
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true });
        const state = await AdminNotificationState.collection.findOne({});
        expect((state?.registrationsLastOpenedAt as Date).getTime()).toBeGreaterThanOrEqual(before - 1000);
      });

      it("a content manager with every permission gets 403 and no state is written", async () => {
        const mod = await load<Mod>(() => import("./opened/route"), managerCookie);
        expect((await mod.POST()).status).toBe(403);
        expect(await AdminNotificationState.collection.countDocuments({})).toBe(0);
      });
    });
  },
);
