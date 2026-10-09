// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { getTestSessionCookie, seedTestAdmin, seedTestContentManager } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";

/**
 * The 010 account actions across roles (docs/briefs/011-roles-and-users.md,
 * carried over from 010; Constitution III as amended: the main admin
 * controls every password). A content manager cannot change ANY password,
 * their own included; a main admin changes only their own, needing the
 * current one. Every role may sign out its OWN other devices. Real Better
 * Auth sessions against the real test database.
 */
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const ADMIN_EMAIL = "roles-account-admin@example.test";
const ADMIN2_EMAIL = "roles-account-admin2@example.test";
const CM_EMAIL = "roles-account-manager@example.test";
const ADMIN_PASSWORD = "the-main-admins-password-1";
const ADMIN2_PASSWORD = "the-second-admins-password-1";
const CM_PASSWORD = "the-managers-password-1";
const NEW_PASSWORD = "a-brand-new-password-2026";

async function runAs<T>(cookie: string, fn: (actions: typeof import("./actions")) => Promise<T>): Promise<T> {
  vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie, "x-forwarded-for": "203.0.113.77" })));
  vi.resetModules();
  return fn(await import("./actions"));
}

function changeForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const validChange = (current: string, next: string = NEW_PASSWORD) =>
  changeForm({ currentPassword: current, newPassword: next, confirmPassword: next });

async function canSignIn(email: string, password: string): Promise<boolean> {
  const { getAuth } = await import("@/lib/auth");
  return (await getAuth()).api
    .signInEmail({ body: { email, password }, headers: new Headers({ "x-forwarded-for": "203.0.113.78" }) })
    .then(() => true)
    .catch(() => false);
}

async function sessionValid(cookie: string): Promise<boolean> {
  const { getAuth } = await import("@/lib/auth");
  const result = await (await getAuth()).api.getSession({ headers: new Headers({ cookie }) });
  return Boolean(result?.session);
}

describeWithDb("account actions across roles (011 / 010 carried over)", ["user", "account", "session", "throttles", "userChanges"], () => {
  let adminCookie: string;
  let cmCookie: string;

  beforeEach(async () => {
    vi.doUnmock("next/headers");
    vi.resetModules();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    // A content manager with NO section grants at all.
    await seedTestContentManager(CM_EMAIL, CM_PASSWORD, []);
    adminCookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    cmCookie = await getTestSessionCookie(CM_EMAIL, CM_PASSWORD);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("a content manager cannot change a password, not even their own: forbidden, nothing changes", async () => {
    const state = await runAs(cmCookie, (a) => a.changePassword({ status: "idle" }, validChange(CM_PASSWORD)));
    expect(state).toEqual({ status: "error", error: "forbidden" });
    expect(await canSignIn(CM_EMAIL, CM_PASSWORD)).toBe(true);
    expect(await canSignIn(CM_EMAIL, NEW_PASSWORD)).toBe(false);
    expect(await sessionValid(cmCookie)).toBe(true);
  });

  it("…nor can they use a crafted userId or email to change the main admin's password", async () => {
    const ctx = await (await (await import("@/lib/auth")).getAuth()).$context;
    const adminId = (await ctx.internalAdapter.findUserByEmail(ADMIN_EMAIL))!.user.id;

    const state = await runAs(cmCookie, (a) =>
      a.changePassword(
        { status: "idle" },
        changeForm({
          currentPassword: ADMIN_PASSWORD,
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD,
          userId: adminId,
          email: ADMIN_EMAIL,
          targetId: adminId,
        }),
      ),
    );
    expect(state).toEqual({ status: "error", error: "forbidden" });
    expect(await canSignIn(ADMIN_EMAIL, ADMIN_PASSWORD)).toBe(true);
    expect(await canSignIn(ADMIN_EMAIL, NEW_PASSWORD)).toBe(false);
    expect(await sessionValid(adminCookie)).toBe(true);
  });

  it("a content manager's refused attempts never touch the lockout counters (nothing to guess)", async () => {
    for (let i = 0; i < 6; i++) {
      const state = await runAs(cmCookie, (a) => a.changePassword({ status: "idle" }, validChange("definitely-wrong-1")));
      expect(state).toEqual({ status: "error", error: "forbidden" });
    }
    const mongoose = (await import("mongoose")).default;
    const keys = await mongoose.connection.db!.collection("throttles").countDocuments({ key: /^password-change:user:/ });
    expect(keys).toBe(0);
  });

  it("the main admin changes their OWN password; the content manager's password and sessions are untouched", async () => {
    const cmOtherDevice = await getTestSessionCookie(CM_EMAIL, CM_PASSWORD);
    const state = await runAs(adminCookie, (a) => a.changePassword({ status: "idle" }, validChange(ADMIN_PASSWORD)));
    expect(state.status).toBe("success");
    expect(await canSignIn(ADMIN_EMAIL, NEW_PASSWORD)).toBe(true);
    expect(await canSignIn(ADMIN_EMAIL, ADMIN_PASSWORD)).toBe(false);

    expect(await canSignIn(CM_EMAIL, CM_PASSWORD)).toBe(true);
    expect(await sessionValid(cmCookie)).toBe(true);
    expect(await sessionValid(cmOtherDevice)).toBe(true);
  });

  it("a main admin needs the current password, and a crafted userId changes only themselves", async () => {
    const ctx = await (await (await import("@/lib/auth")).getAuth()).$context;
    const cmId = (await ctx.internalAdapter.findUserByEmail(CM_EMAIL))!.user.id;

    const wrong = await runAs(adminCookie, (a) => a.changePassword({ status: "idle" }, validChange("not-the-current-1")));
    expect(wrong).toEqual({ status: "error", error: "wrong_current" });

    await runAs(adminCookie, (a) =>
      a.changePassword(
        { status: "idle" },
        changeForm({
          currentPassword: ADMIN_PASSWORD,
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD,
          userId: cmId,
          email: CM_EMAIL,
        }),
      ),
    );
    expect(await canSignIn(CM_EMAIL, CM_PASSWORD)).toBe(true);
    expect(await canSignIn(CM_EMAIL, NEW_PASSWORD)).toBe(false);
    expect(await canSignIn(ADMIN_EMAIL, NEW_PASSWORD)).toBe(true);
  });

  it("the lockout counter is per account: one main admin's 5 wrong attempts block only them", async () => {
    await seedTestAdmin(ADMIN2_EMAIL, ADMIN2_PASSWORD);
    const admin2Cookie = await getTestSessionCookie(ADMIN2_EMAIL, ADMIN2_PASSWORD);

    for (let i = 0; i < 5; i++) {
      const state = await runAs(adminCookie, (a) => a.changePassword({ status: "idle" }, validChange("definitely-wrong-1")));
      expect(state).toEqual({ status: "error", error: "wrong_current" });
    }
    const blocked = await runAs(adminCookie, (a) => a.changePassword({ status: "idle" }, validChange(ADMIN_PASSWORD)));
    expect(blocked).toEqual({ status: "error", error: "blocked" });

    const other = await runAs(admin2Cookie, (a) => a.changePassword({ status: "idle" }, validChange(ADMIN2_PASSWORD)));
    expect(other.status).toBe("success");
  });

  it("'Sign out other devices' stays open to a content manager and ends only their own other sessions", async () => {
    const cmOtherDevice = await getTestSessionCookie(CM_EMAIL, CM_PASSWORD);
    const adminOtherDevice = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);

    expect(await runAs(cmCookie, (a) => a.signOutOtherDevices())).toEqual({ status: "success" });

    expect(await sessionValid(cmCookie)).toBe(true);
    expect(await sessionValid(cmOtherDevice)).toBe(false);
    expect(await sessionValid(adminCookie)).toBe(true);
    expect(await sessionValid(adminOtherDevice)).toBe(true);
  });

  it("…and the reverse: the main admin's 'Sign out other devices' leaves every content manager session", async () => {
    const adminOtherDevice = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cmOtherDevice = await getTestSessionCookie(CM_EMAIL, CM_PASSWORD);

    expect(await runAs(adminCookie, (a) => a.signOutOtherDevices())).toEqual({ status: "success" });

    expect(await sessionValid(adminOtherDevice)).toBe(false);
    expect(await sessionValid(adminCookie)).toBe(true);
    expect(await sessionValid(cmCookie)).toBe(true);
    expect(await sessionValid(cmOtherDevice)).toBe(true);
  });
});
