// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { getTestSessionCookie, seedTestAdmin, seedTestContentManager } from "@/test/admin-session";
import {
  createOrRestoreUser,
  deleteUser,
  disableUser,
  enableUser,
  resetUserPassword,
  updateUserAccess,
} from "@/lib/users/mutations";
import { countActiveMainAdmins, listUsers } from "@/lib/users/queries";

// Real Better Auth against a remote test database: the first case pays for
// module loading and index creation.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const PASSWORD = "correct-horse-battery-staple";
const ADMIN = { userId: "", email: "main-admin@example.test" };
const CM_EMAIL = "manager@example.test";
// The password an admin types or generates in the panel: 12+ characters.
const TEMP = "Admin-Set-Temp-Pw-1";
const RESET_PASSWORD = "Admin-Reset-Temp-Pw-2";

/** createOrRestoreUser as the panel calls it: with the password the admin set. */
const create = (args: Omit<Parameters<typeof createOrRestoreUser>[0], "password"> & { password?: string }) =>
  createOrRestoreUser({ password: TEMP, ...args });

async function mainAdmin() {
  ADMIN.userId = await seedTestAdmin(ADMIN.email, PASSWORD);
  return { ...ADMIN };
}

async function userDoc(email: string) {
  const { getAuth } = await import("@/lib/auth");
  const ctx = await (await getAuth()).$context;
  const found = await ctx.internalAdapter.findUserByEmail(email);
  return (found?.user ?? null) as
    | (NonNullable<typeof found>["user"] & {
        role?: string;
        permissions?: string[];
        disabledAt?: Date | null;
        deletedAt?: Date | null;
      })
    | null;
}

async function canSignIn(email: string, password: string): Promise<boolean> {
  const { getAuth } = await import("@/lib/auth");
  return (await getAuth()).api
    .signInEmail({ body: { email, password } })
    .then(() => true)
    .catch(() => false);
}

async function sessionValid(cookie: string): Promise<boolean> {
  const { getAuth } = await import("@/lib/auth");
  const result = await (await getAuth()).api.getSession({ headers: new Headers({ cookie }) });
  return Boolean(result?.session);
}

async function changeEntries() {
  const mongoose = (await import("mongoose")).default;
  return mongoose.connection.db!.collection("userChanges").find({}).sort({ at: 1 }).toArray();
}

let consoleSpies: Array<ReturnType<typeof vi.spyOn>> = [];
function everythingLogged(): string {
  return consoleSpies.flatMap((spy) => spy.mock.calls.map((call) => JSON.stringify(call))).join("\n");
}

describeWithDb("user mutations (011)", ["user", "account", "session", "userChanges", "throttles"], () => {
  beforeEach(() => {
    consoleSpies = (["info", "warn", "error", "log"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  });
  afterEach(() => {
    for (const spy of consoleSpies) spy.mockRestore();
  });

  describe("createOrRestoreUser", () => {
    it("creates a content manager whose admin-set password logs in as it stands, and never returns it", async () => {
      const actor = await mainAdmin();
      const result = await create({ actor, email: CM_EMAIL, role: "content_manager", permissions: ["news", "messages"] });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result).toEqual({ ok: true, email: CM_EMAIL });

      const user = await userDoc(CM_EMAIL);
      expect(user).toMatchObject({ role: "content_manager", permissions: ["news", "messages"] });
      expect(user!.disabledAt ?? null).toBeNull();
      expect(await canSignIn(CM_EMAIL, TEMP)).toBe(true);

      const entries = await changeEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        type: "created",
        actorEmail: ADMIN.email,
        targetEmail: CM_EMAIL,
        details: { role: "content_manager", permissions: ["news", "messages"], restored: false },
      });
    });

    it("stores no grants for a main admin, and drops unknown keys", async () => {
      const actor = await mainAdmin();
      await create({ actor, email: "second-admin@example.test", role: "main_admin", permissions: ["news"] });
      expect((await userDoc("second-admin@example.test"))!.permissions ?? []).toEqual([]);
      await create({
        actor,
        email: "junk@example.test",
        role: "content_manager",
        permissions: ["news", "main_admin", "users"] as never,
      });
      expect((await userDoc("junk@example.test"))!.permissions).toEqual(["news"]);
    });

    it("refuses an email an existing account already uses", async () => {
      const actor = await mainAdmin();
      await seedTestContentManager("ayesha@school.pk", PASSWORD, ["news"]);
      const result = await create({ actor, email: "ayesha@school.pk", role: "content_manager", permissions: [] });
      expect(result).toEqual({ ok: false, error: "email_taken" });
      expect((await userDoc("ayesha@school.pk"))!.permissions).toEqual(["news"]);
    });

    it("two creates of the same new email at the same moment yield exactly one account", async () => {
      const actor = await mainAdmin();
      const results = await Promise.all([
        create({ actor, email: "race@example.test", role: "content_manager", permissions: [] }),
        create({ actor, email: "race@example.test", role: "content_manager", permissions: [] }),
      ]);
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok && r.error === "email_taken")).toHaveLength(1);
      const mongoose = (await import("mongoose")).default;
      expect(await mongoose.connection.db!.collection("user").countDocuments({ email: "race@example.test" })).toBe(1);
    });

    it("restores a deleted account as a brand-new one: nothing from before carries over", async () => {
      const actor = await mainAdmin();
      const oldId = await seedTestAdmin("returning@example.test", "the-old-password-1", {
        role: "main_admin",
        deletedAt: new Date(),
        disabledAt: new Date(),
      });
      await seedTestAdmin("returning@example.test", "the-old-password-1", { role: "main_admin", deletedAt: null });
      const oldCookie = await getTestSessionCookie("returning@example.test", "the-old-password-1");
      await seedTestAdmin("returning@example.test", "the-old-password-1", {
        role: "main_admin",
        deletedAt: new Date(),
        disabledAt: new Date(),
      });

      const result = await create({ actor, email: "returning@example.test", role: "content_manager", permissions: ["pages"] });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const user = await userDoc("returning@example.test");
      expect(user!.id).toBe(oldId);
      expect(user).toMatchObject({ role: "content_manager", permissions: ["pages"] });
      expect(user!.deletedAt ?? null).toBeNull();
      expect(user!.disabledAt ?? null).toBeNull();
      expect(await canSignIn("returning@example.test", "the-old-password-1")).toBe(false);
      expect(await canSignIn("returning@example.test", TEMP)).toBe(true);
      expect(await sessionValid(oldCookie)).toBe(false);

      const created = (await changeEntries()).filter((e) => e.type === "created");
      expect(created).toHaveLength(1);
      expect(created[0]!.details.restored).toBe(true);
    });

    it("never lets the password reach the change record or any log line", async () => {
      const actor = await mainAdmin();
      const result = await create({ actor, email: CM_EMAIL, role: "content_manager", permissions: ["news"] });
      expect(result.ok).toBe(true);
      expect(JSON.stringify(result)).not.toContain(TEMP);
      const captured = JSON.stringify(await changeEntries()) + "\n" + everythingLogged();
      expect(captured).not.toContain(TEMP);
      expect(captured).toContain("user_created");
    });
  });

  describe("updateUserAccess", () => {
    it("changes grants, records added and removed, and applies on the target's next request without ending sessions", async () => {
      const actor = await mainAdmin();
      const targetId = await seedTestContentManager(CM_EMAIL, PASSWORD, ["news"]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);

      const result = await updateUserAccess({ actor, targetId, role: "content_manager", permissions: ["messages", "settings"] });
      expect(result).toEqual({ ok: true });

      expect((await userDoc(CM_EMAIL))!.permissions).toEqual(["messages", "settings"]);
      expect(await sessionValid(cookie)).toBe(true);
      const entries = await changeEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        type: "permissions_changed",
        details: { added: ["messages", "settings"], removed: ["news"] },
      });
    });

    it("changes the role and records it; promoting a content manager is one role change, not a list of removed sections", async () => {
      const actor = await mainAdmin();
      const targetId = await seedTestContentManager(CM_EMAIL, PASSWORD, ["news", "messages"]);
      expect(await updateUserAccess({ actor, targetId, role: "main_admin", permissions: ["news"] })).toEqual({ ok: true });
      expect(await userDoc(CM_EMAIL)).toMatchObject({ role: "main_admin" });
      const entries = await changeEntries();
      expect(entries.map((e) => e.type)).toEqual(["role_changed"]);
      expect(entries[0]!.details).toEqual({ from: "content_manager", to: "main_admin" });
    });

    it("records nothing when nothing changed", async () => {
      const actor = await mainAdmin();
      const targetId = await seedTestContentManager(CM_EMAIL, PASSWORD, ["news"]);
      expect(await updateUserAccess({ actor, targetId, role: "content_manager", permissions: ["news"] })).toEqual({ ok: true });
      expect(await changeEntries()).toHaveLength(0);
    });

    it("refuses to change the actor's own role or grants (FR-011, FR-026)", async () => {
      const actor = await mainAdmin();
      expect(await updateUserAccess({ actor, targetId: actor.userId, role: "content_manager", permissions: [] })).toEqual({
        ok: false,
        error: "self",
      });
      expect((await userDoc(ADMIN.email))!.role).toBe("main_admin");
    });

    it("not_found for an unknown, malformed or deleted target", async () => {
      const actor = await mainAdmin();
      const deleted = await seedTestContentManager("gone@example.test", PASSWORD, [], { deletedAt: new Date() });
      for (const targetId of ["507f1f77bcf86cd799439011", "not-an-id", deleted]) {
        expect(await updateUserAccess({ actor, targetId, role: "content_manager", permissions: [] })).toEqual({
          ok: false,
          error: "not_found",
        });
      }
    });

    it("refuses a demotion that would leave no active main admin, and changes nothing", async () => {
      // The actor is not itself an active main admin here (a stand-in for the
      // moment after a concurrent change), so the target is the only one.
      const onlyAdmin = await seedTestAdmin("only-admin@example.test", PASSWORD);
      const ghost = { userId: "507f1f77bcf86cd799439012", email: "ghost@example.test" };
      const result = await updateUserAccess({ actor: ghost, targetId: onlyAdmin, role: "content_manager", permissions: [] });
      expect(result).toEqual({ ok: false, error: "last_main_admin" });
      expect((await userDoc("only-admin@example.test"))!.role).toBe("main_admin");
      expect(await countActiveMainAdmins()).toBe(1);
      expect(await changeEntries()).toHaveLength(0);
    });

    it("keeps at least one main admin when two main admins demote each other at the same moment", async () => {
      const idA = await seedTestAdmin("race-a@example.test", PASSWORD);
      const idB = await seedTestAdmin("race-b@example.test", PASSWORD);
      const a = { userId: idA, email: "race-a@example.test" };
      const b = { userId: idB, email: "race-b@example.test" };

      for (let round = 0; round < 10; round++) {
        await Promise.all([
          updateUserAccess({ actor: a, targetId: idB, role: "content_manager", permissions: [] }),
          updateUserAccess({ actor: b, targetId: idA, role: "content_manager", permissions: [] }),
        ]);
        expect(await countActiveMainAdmins(), `round ${round}`).toBeGreaterThanOrEqual(1);
        // Reset for the next round.
        await seedTestAdmin("race-a@example.test", PASSWORD, { role: "main_admin" });
        await seedTestAdmin("race-b@example.test", PASSWORD, { role: "main_admin" });
      }
    });
  });

  describe("disableUser / enableUser", () => {
    it("disable: no login, every session ends, the old cookie is refused; enable restores the same password and grants", async () => {
      const actor = await mainAdmin();
      const targetId = await seedTestContentManager(CM_EMAIL, PASSWORD, ["news"]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      const otherDevice = await getTestSessionCookie(CM_EMAIL, PASSWORD);

      expect(await disableUser({ actor, targetId })).toEqual({ ok: true });
      expect((await userDoc(CM_EMAIL))!.disabledAt).toBeTruthy();
      expect(await sessionValid(cookie)).toBe(false);
      expect(await sessionValid(otherDevice)).toBe(false);
      expect(await canSignIn(CM_EMAIL, PASSWORD)).toBe(false);

      expect(await enableUser({ actor, targetId })).toEqual({ ok: true });
      expect(await canSignIn(CM_EMAIL, PASSWORD)).toBe(true);
      expect((await userDoc(CM_EMAIL))!.permissions).toEqual(["news"]);
      expect((await changeEntries()).map((e) => e.type)).toEqual(["disabled", "enabled"]);
    });

    it("refuses self, and disabling the last active main admin", async () => {
      const actor = await mainAdmin();
      expect(await disableUser({ actor, targetId: actor.userId })).toEqual({ ok: false, error: "self" });
      expect(await enableUser({ actor, targetId: actor.userId })).toEqual({ ok: false, error: "self" });

      const onlyAdmin = await seedTestAdmin("sole@example.test", PASSWORD, { role: "main_admin" });
      await seedTestAdmin(ADMIN.email, PASSWORD, { role: "content_manager" });
      const ghost = { userId: "507f1f77bcf86cd799439012", email: "ghost@example.test" };
      expect(await disableUser({ actor: ghost, targetId: onlyAdmin })).toEqual({ ok: false, error: "last_main_admin" });
      expect((await userDoc("sole@example.test"))!.disabledAt ?? null).toBeNull();
    });

    it("a disabled main admin does not count as active, so the other one cannot be disabled either", async () => {
      const a = await seedTestAdmin("cnt-a@example.test", PASSWORD);
      const b = await seedTestAdmin("cnt-b@example.test", PASSWORD, { disabledAt: new Date() });
      expect(await countActiveMainAdmins()).toBe(1);
      const actor = { userId: b, email: "cnt-b@example.test" };
      expect(await disableUser({ actor, targetId: a })).toEqual({ ok: false, error: "last_main_admin" });
    });
  });

  describe("resetUserPassword", () => {
    it("sets the given password, ends sessions, and never logs it", async () => {
      const actor = await mainAdmin();
      const targetId = await seedTestContentManager(CM_EMAIL, PASSWORD, ["news"]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);

      const result = await resetUserPassword({ actor, targetId, password: RESET_PASSWORD });
      expect(result).toEqual({ ok: true });

      expect(await sessionValid(cookie)).toBe(false);
      expect(await canSignIn(CM_EMAIL, PASSWORD)).toBe(false);
      expect(await canSignIn(CM_EMAIL, RESET_PASSWORD)).toBe(true);
      const entries = await changeEntries();
      expect(entries.map((e) => e.type)).toEqual(["password_set"]);
      const captured = JSON.stringify(entries) + "\n" + everythingLogged();
      expect(captured).not.toContain(RESET_PASSWORD);
      expect(captured).not.toContain(PASSWORD);
    });

    it("can reset another main admin, but not the actor themselves", async () => {
      const actor = await mainAdmin();
      const other = await seedTestAdmin("other-admin@example.test", PASSWORD);
      expect(await resetUserPassword({ actor, targetId: other, password: RESET_PASSWORD })).toEqual({ ok: true });
      expect(await resetUserPassword({ actor, targetId: actor.userId, password: RESET_PASSWORD })).toEqual({
        ok: false,
        error: "self",
      });
    });
  });

  describe("updateUserAccess with a password (the edit panel)", () => {
    it("filling the password also sets it: the old one is dead and sessions are ended", async () => {
      const actor = await mainAdmin();
      const targetId = await seedTestContentManager(CM_EMAIL, PASSWORD, ["news"]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);

      const result = await updateUserAccess({
        actor,
        targetId,
        role: "content_manager",
        permissions: ["news", "messages"],
        password: RESET_PASSWORD,
      });
      expect(result).toEqual({ ok: true });

      expect((await userDoc(CM_EMAIL))!.permissions).toEqual(["news", "messages"]);
      expect(await sessionValid(cookie)).toBe(false);
      expect(await canSignIn(CM_EMAIL, PASSWORD)).toBe(false);
      expect(await canSignIn(CM_EMAIL, RESET_PASSWORD)).toBe(true);
      expect((await changeEntries()).map((e) => e.type)).toEqual(["permissions_changed", "password_set"]);
    });

    it("no password leaves the old one working; a password alone still resets", async () => {
      const actor = await mainAdmin();
      const targetId = await seedTestContentManager(CM_EMAIL, PASSWORD, ["news"]);

      expect(await updateUserAccess({ actor, targetId, role: "content_manager", permissions: ["news"] })).toEqual({ ok: true });
      expect(await canSignIn(CM_EMAIL, PASSWORD)).toBe(true);
      expect(await changeEntries()).toHaveLength(0);

      expect(
        await updateUserAccess({ actor, targetId, role: "content_manager", permissions: ["news"], password: RESET_PASSWORD }),
      ).toEqual({ ok: true });
      expect(await canSignIn(CM_EMAIL, RESET_PASSWORD)).toBe(true);
      expect((await changeEntries()).map((e) => e.type)).toEqual(["password_set"]);
    });

    it("a refused role change (last main admin) applies no password either", async () => {
      const onlyAdmin = await seedTestAdmin("only-pw@example.test", PASSWORD);
      const ghost = { userId: "507f1f77bcf86cd799439012", email: "ghost@example.test" };
      const result = await updateUserAccess({
        actor: ghost,
        targetId: onlyAdmin,
        role: "content_manager",
        permissions: [],
        password: RESET_PASSWORD,
      });
      expect(result).toEqual({ ok: false, error: "last_main_admin" });
      expect(await canSignIn("only-pw@example.test", PASSWORD)).toBe(true);
      expect(await canSignIn("only-pw@example.test", RESET_PASSWORD)).toBe(false);
    });
  });

  describe("deleteUser", () => {
    it("soft-deletes: hidden from the list, sessions gone, login refused, change history kept", async () => {
      const actor = await mainAdmin();
      const targetId = await seedTestContentManager(CM_EMAIL, PASSWORD, ["news"]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      await disableUser({ actor, targetId });
      await enableUser({ actor, targetId });

      expect(await deleteUser({ actor, targetId })).toEqual({ ok: true });
      expect((await userDoc(CM_EMAIL))!.deletedAt).toBeTruthy();
      expect(await sessionValid(cookie)).toBe(false);
      expect(await canSignIn(CM_EMAIL, PASSWORD)).toBe(false);
      expect((await listUsers()).map((u) => u.email)).not.toContain(CM_EMAIL);
      expect((await changeEntries()).map((e) => e.type)).toEqual(["disabled", "enabled", "deleted"]);
      // Deleted is gone for every later action.
      expect(await disableUser({ actor, targetId })).toEqual({ ok: false, error: "not_found" });
    });

    it("refuses self, and deleting the last active main admin", async () => {
      const actor = await mainAdmin();
      expect(await deleteUser({ actor, targetId: actor.userId })).toEqual({ ok: false, error: "self" });
      const onlyAdmin = await seedTestAdmin("sole-delete@example.test", PASSWORD);
      await seedTestAdmin(ADMIN.email, PASSWORD, { role: "content_manager" });
      const ghost = { userId: "507f1f77bcf86cd799439012", email: "ghost@example.test" };
      expect(await deleteUser({ actor: ghost, targetId: onlyAdmin })).toEqual({ ok: false, error: "last_main_admin" });
      expect((await userDoc("sole-delete@example.test"))!.deletedAt ?? null).toBeNull();
    });
  });
});
