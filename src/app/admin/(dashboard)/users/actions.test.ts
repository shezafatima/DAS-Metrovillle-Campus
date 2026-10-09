// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { getTestSessionCookie, seedTestAdmin, seedTestContentManager } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";
import { PERMISSION_KEYS } from "@/lib/permissions";

// Real Better Auth against a remote test database: the first case pays for
// module loading and index creation.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const PASSWORD = "correct-horse-battery-staple";
const ADMIN_EMAIL = "actions-admin@example.test";
const CM_EMAIL = "actions-manager@example.test";
const TARGET_EMAIL = "actions-target@example.test";
// What the admin types or generates in the panel: 12+ characters.
const SET_PASSWORD = "Panel-Set-Temp-Pw-1";

type ActionName = "createUser" | "updateUserAccess" | "disableUser" | "enableUser" | "deleteUser";

/** Runs the real Server Action as the holder of `cookie` (null → no session). */
async function run(name: ActionName, cookie: string | null, fields: Record<string, string | string[]>) {
  vi.doMock("next/headers", () => mockNextHeaders(new Headers(cookie ? { cookie } : {})));
  vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
  vi.resetModules();
  const actions = await import("./actions");
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) fd.append(key, v);
  }
  return (actions[name] as (prev: unknown, fd: FormData) => Promise<Record<string, unknown>>)({ status: "idle" }, fd);
}

async function snapshot() {
  const mongoose = (await import("mongoose")).default;
  const users = await mongoose.connection.db!.collection("user").find({}).sort({ email: 1 }).toArray();
  return JSON.stringify(
    users.map((u) => [u.email, u.role, u.permissions, u.disabledAt ?? null, u.deletedAt ?? null]),
  );
}

async function userRow(email: string) {
  const mongoose = (await import("mongoose")).default;
  return mongoose.connection.db!.collection("user").findOne({ email });
}

async function canSignIn(email: string, password: string): Promise<boolean> {
  const { getAuth } = await import("@/lib/auth");
  return (await getAuth()).api
    .signInEmail({ body: { email, password }, headers: new Headers({ "x-forwarded-for": "203.0.113.90" }) })
    .then(() => true)
    .catch(() => false);
}

describeWithDb("users Server Actions: the three access cases (011)", ["user", "account", "session", "userChanges", "throttles"], () => {
  let targetId: string;

  beforeEach(async () => {
    vi.doUnmock("next/headers");
    vi.doUnmock("next/cache");
    vi.resetModules();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    targetId = await seedTestContentManager(TARGET_EMAIL, PASSWORD, ["news"]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const cases: Array<{ name: ActionName; fields: () => Record<string, string | string[]> }> = [
    {
      name: "createUser",
      fields: () => ({ email: "new-person@example.test", permissions: ["news"], password: SET_PASSWORD }),
    },
    { name: "updateUserAccess", fields: () => ({ targetId, role: "main_admin" }) },
    { name: "disableUser", fields: () => ({ targetId }) },
    { name: "enableUser", fields: () => ({ targetId }) },
    { name: "deleteUser", fields: () => ({ targetId }) },
  ];

  for (const { name, fields } of cases) {
    it(`${name}: no session → unauthorized, nothing changes`, async () => {
      const before = await snapshot();
      expect(await run(name, null, fields())).toEqual({ status: "error", error: "unauthorized" });
      expect(await snapshot()).toBe(before);
    });

    it(`${name}: a content manager holding EVERY grant → forbidden, nothing changes`, async () => {
      await seedTestContentManager(CM_EMAIL, PASSWORD, [...PERMISSION_KEYS]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      const before = await snapshot();
      expect(await run(name, cookie, fields())).toEqual({ status: "error", error: "forbidden" });
      expect(await snapshot()).toBe(before);
    });

    it(`${name}: a main admin disabled while holding a live cookie → unauthorized, nothing changes`, async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD, { disabledAt: new Date() });
      const before = await snapshot();
      expect(await run(name, cookie, fields())).toEqual({ status: "error", error: "unauthorized" });
      expect(await snapshot()).toBe(before);
    });

    it(`${name}: a main admin → success`, async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      const result = await run(name, cookie, fields());
      expect(result).toEqual({ status: "success" });
    });
  }

  it("createUser: saves the account with the password the admin set, and returns no password", async () => {
    await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
    const result = await run("createUser", cookie, {
      email: "  Ayesha@School.PK ",
      role: "content_manager",
      permissions: ["news", "messages"],
      password: SET_PASSWORD,
    });
    expect(result).toEqual({ status: "success" });
    expect(JSON.stringify(result)).not.toContain(SET_PASSWORD);
    expect(await userRow("ayesha@school.pk")).toMatchObject({
      role: "content_manager",
      permissions: ["news", "messages"],
    });
    // The main admin controls every password: it works as set, with no forced change.
    expect(await canSignIn("ayesha@school.pk", SET_PASSWORD)).toBe(true);
  });

  it("createUser: a main admin can be added, and needs no sections", async () => {
    await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
    expect(
      await run("createUser", cookie, { email: "second@example.test", role: "main_admin", password: SET_PASSWORD }),
    ).toEqual({ status: "success" });
    expect(await userRow("second@example.test")).toMatchObject({ role: "main_admin" });
  });

  it("createUser: the same email in other capitals is refused (pointing at the email); an invalid email is a field error", async () => {
    await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
    expect(await run("createUser", cookie, { email: TARGET_EMAIL.toUpperCase(), password: SET_PASSWORD })).toEqual({
      status: "error",
      error: "email_taken",
      field: "email",
    });
    expect(await run("createUser", cookie, { email: "not-an-email", password: SET_PASSWORD })).toEqual({
      status: "error",
      error: "invalid",
      field: "email",
    });
  });

  it("createUser: the password must meet the same length rules as any other (12 to 128)", async () => {
    await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
    for (const password of ["a".repeat(11), "a".repeat(129)]) {
      expect(await run("createUser", cookie, { email: "short-pw@example.test", password })).toEqual({
        status: "error",
        error: "invalid",
        field: "password",
      });
    }
    // Missing entirely is refused too.
    expect(await run("createUser", cookie, { email: "short-pw@example.test" })).toMatchObject({
      status: "error",
      error: "invalid",
    });
    expect(await userRow("short-pw@example.test")).toBeNull();

    expect(await run("createUser", cookie, { email: "ok-pw@example.test", password: "a".repeat(12) })).toEqual({
      status: "success",
    });
    expect(await run("createUser", cookie, { email: "ok-pw2@example.test", password: "a".repeat(128) })).toEqual({
      status: "success",
    });
  });

  it("createUser: a grant outside the five keys is rejected", async () => {
    await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
    for (const bad of ["main_admin", "users", "registrations"]) {
      expect(
        await run("createUser", cookie, { email: "grants@example.test", permissions: [bad], password: SET_PASSWORD }),
      ).toMatchObject({ status: "error", error: "invalid" });
    }
    expect(await userRow("grants@example.test")).toBeNull();
  });

  it("updateUserAccess: a filled password sets it (the old one is dead); an empty one changes nothing", async () => {
    await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);

    expect(await run("updateUserAccess", cookie, { targetId, role: "content_manager", permissions: ["news"], password: "" })).toEqual({
      status: "success",
    });
    expect(await canSignIn(TARGET_EMAIL, PASSWORD)).toBe(true);

    expect(
      await run("updateUserAccess", cookie, { targetId, role: "content_manager", permissions: ["news"], password: SET_PASSWORD }),
    ).toEqual({ status: "success" });
    expect(await canSignIn(TARGET_EMAIL, PASSWORD)).toBe(false);
    expect(await canSignIn(TARGET_EMAIL, SET_PASSWORD)).toBe(true);
  });

  it("updateUserAccess: a too-short password is refused and nothing at all is applied", async () => {
    await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
    const before = await snapshot();
    expect(
      await run("updateUserAccess", cookie, {
        targetId,
        role: "content_manager",
        permissions: ["news", "messages"],
        password: "short",
      }),
    ).toEqual({ status: "error", error: "invalid", field: "password" });
    expect(await snapshot()).toBe(before);
    expect(await canSignIn(TARGET_EMAIL, PASSWORD)).toBe(true);
  });

  // FR-011 / SC-005: no user can raise their own permissions or role.
  it("a content manager cannot raise their OWN permissions or role by any of these actions", async () => {
    const ownId = await seedTestContentManager(CM_EMAIL, PASSWORD, ["news"]);
    const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
    const before = JSON.stringify(await userRow(CM_EMAIL));
    for (const name of ["updateUserAccess", "createUser", "enableUser"] as const) {
      const result = await run(name, cookie, {
        targetId: ownId,
        email: CM_EMAIL,
        role: "main_admin",
        permissions: [...PERMISSION_KEYS],
        password: SET_PASSWORD,
      });
      expect(result).toEqual({ status: "error", error: "forbidden" });
    }
    expect(JSON.stringify(await userRow(CM_EMAIL))).toBe(before);
  });

  it("a main admin cannot change, disable, delete or re-password their own account: self", async () => {
    const ownId = await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
    const before = await snapshot();
    for (const name of ["updateUserAccess", "disableUser", "enableUser", "deleteUser"] as const) {
      expect(await run(name, cookie, { targetId: ownId, role: "content_manager", password: SET_PASSWORD })).toEqual({
        status: "error",
        error: "self",
      });
    }
    expect(await snapshot()).toBe(before);
    expect(await canSignIn(ADMIN_EMAIL, PASSWORD)).toBe(true);
  });

  it("an unknown target is not_found, and a missing role is invalid", async () => {
    await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
    expect(await run("disableUser", cookie, { targetId: "507f1f77bcf86cd799439011" })).toEqual({
      status: "error",
      error: "not_found",
    });
    expect(await run("updateUserAccess", cookie, { role: "content_manager" })).toEqual({ status: "error", error: "invalid" });
  });
});
