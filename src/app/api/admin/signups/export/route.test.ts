// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedTestAdmin, getTestSessionCookie } from "@/test/admin-session";
import { Signup } from "@/models/signup";

const ADMIN_EMAIL = "signup-export-route-test@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";

function request(url = "http://localhost/api/admin/signups/export"): Request {
  return new Request(url);
}

describeWithDb("GET /api/admin/signups/export", ["signups", "user", "account", "session"], () => {
  beforeEach(() => {
    vi.doUnmock("next/headers");
    vi.resetModules();
  });

  it("returns 401 without a session", async () => {
    vi.doMock("next/headers", () => ({ headers: async () => new Headers() }));
    const { GET } = await import("./route");

    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns a CSV with the expected headers and filtered rows for an authorized admin", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);

    const now = new Date();
    await Signup.create({
      name: "علی خان",
      email: "urdu@example.com",
      phone: "+923001234567",
      sources: ["home"],
      firstSignupAt: now,
      lastSignupAt: now,
    });
    await Signup.create({
      name: "Sara Ahmed",
      email: "sara@example.com",
      phone: "+923009999999",
      sources: ["resources"],
      firstSignupAt: now,
      lastSignupAt: now,
    });
    const deleted = await Signup.create({
      name: "Deleted Person",
      email: "deleted@example.com",
      phone: "+923008888888",
      sources: ["home"],
      firstSignupAt: now,
      lastSignupAt: now,
    });
    await Signup.softDeleteById(deleted._id);

    vi.doMock("next/headers", () => ({ headers: async () => new Headers({ cookie }) }));
    vi.resetModules();
    const { GET } = await import("./route");

    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toMatch(
      /attachment; filename="signups-\d{4}-\d{2}-\d{2}\.csv"/,
    );

    // response.text() decodes as UTF-8 and strips a leading BOM per the
    // WHATWG spec (TextDecoder's default ignoreBOM: false) — check the
    // BOM via the raw bytes Excel actually reads, and content via text().
    const bytes = new Uint8Array(await response.clone().arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);

    const body = await response.text();
    expect(body).toContain("علی خان");
    expect(body).toContain("Sara Ahmed");
    expect(body).not.toContain("Deleted Person");
  });

  it("narrows to the source filter", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    const now = new Date();
    await Signup.create({
      name: "Home Person",
      email: "home-export@example.com",
      phone: "+923001234567",
      sources: ["home"],
      firstSignupAt: now,
      lastSignupAt: now,
    });
    await Signup.create({
      name: "Resources Person",
      email: "resources-export@example.com",
      phone: "+923009999999",
      sources: ["resources"],
      firstSignupAt: now,
      lastSignupAt: now,
    });

    vi.doMock("next/headers", () => ({ headers: async () => new Headers({ cookie }) }));
    vi.resetModules();
    const { GET } = await import("./route");

    const response = await GET(request("http://localhost/api/admin/signups/export?source=resources"));
    const body = await response.text();
    expect(body).toContain("Resources Person");
    expect(body).not.toContain("Home Person");
  });

  it("returns just the header row when nothing matches the query", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);

    vi.doMock("next/headers", () => ({ headers: async () => new Headers({ cookie }) }));
    vi.resetModules();
    const { GET } = await import("./route");

    const response = await GET(request("http://localhost/api/admin/signups/export?q=nomatch12345"));
    const body = await response.text();
    const lines = body.split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(1); // header only
  });
});
