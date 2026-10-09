// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { getTestSessionCookie, seedTestAdmin, seedTestContentManager } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { defaultsFor } from "@/lib/settings/defaults";
import { GROUPS, GROUP_KEYS } from "@/lib/settings/registry";
import type { GroupKey } from "@/lib/settings/types";

// Real Better Auth against a remote test database: the first case pays for
// module loading and index creation.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const PASSWORD = "correct-horse-battery-staple";
const ADMIN_EMAIL = "settings-admin@example.test";
const CM_EMAIL = "settings-manager@example.test";

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();

/** Runs the real Server Action as the holder of `cookie` (null → no session). */
async function run(cookie: string | null, input: { group: string; expectedVersion: number; data: unknown } & Record<string, unknown>) {
  vi.doMock("next/headers", () => mockNextHeaders(new Headers(cookie ? { cookie } : {})));
  vi.doMock("next/cache", () => ({ revalidatePath, revalidateTag, unstable_cache: (fn: unknown) => fn }));
  vi.resetModules();
  const { saveSettingsGroup } = await import("./actions");
  return saveSettingsGroup(input);
}

async function settingsDoc(group: string) {
  const mongoose = (await import("mongoose")).default;
  return mongoose.connection.db!.collection("settings").findOne({ _id: group as never });
}

function payload(group: GroupKey) {
  return { group, expectedVersion: 0, data: defaultsFor(GROUPS[group]) };
}

describeWithDb(
  "saveSettingsGroup: the three access cases (Constitution XI) for every group",
  ["user", "account", "session", "settings", "throttles"],
  () => {
    beforeEach(() => {
      vi.doUnmock("next/headers");
      vi.doUnmock("next/cache");
      vi.resetModules();
      revalidateTag.mockClear();
      revalidatePath.mockClear();
      vi.spyOn(console, "info").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    for (const group of GROUP_KEYS) {
      it(`${group}: no session → unauthorized, nothing written`, async () => {
        expect(await run(null, payload(group))).toEqual({ status: "error", error: "unauthorized" });
        expect(await settingsDoc(group)).toBeNull();
        expect(revalidateTag).not.toHaveBeenCalled();
      });

      it(`${group}: a content manager holding every grant EXCEPT settings → forbidden, nothing written, access_denied logged`, async () => {
        await seedTestContentManager(CM_EMAIL, PASSWORD, PERMISSION_KEYS.filter((key) => key !== "settings"));
        const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
        const info = vi.spyOn(console, "info");

        expect(await run(cookie, payload(group))).toEqual({ status: "error", error: "forbidden" });
        expect(await settingsDoc(group)).toBeNull();
        expect(revalidateTag).not.toHaveBeenCalled();
        expect(info.mock.calls.some(([line]) => String(line).includes('"access_denied"') && String(line).includes('"settings"'))).toBe(true);
      });

      it(`${group}: a content manager with settings → saves`, async () => {
        await seedTestContentManager(CM_EMAIL, PASSWORD, ["settings"]);
        const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
        expect(await run(cookie, payload(group))).toMatchObject({ status: "success", version: 1 });
        expect(await settingsDoc(group)).toMatchObject({ version: 1, updatedBy: CM_EMAIL });
      });

      it(`${group}: a main admin → saves`, async () => {
        await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
        const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
        expect(await run(cookie, payload(group))).toMatchObject({ status: "success", version: 1 });
      });
    }

    it("a user disabled while holding a live cookie → unauthorized, nothing written", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD, { disabledAt: new Date() });
      expect(await run(cookie, payload("stats"))).toEqual({ status: "error", error: "unauthorized" });
      expect(await settingsDoc("stats")).toBeNull();
    });

    it("US1 scenario 4: a settings grant removed after the form loaded → the save is refused, nothing changes", async () => {
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["settings"]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["news"]);
      expect(await run(cookie, payload("stats"))).toEqual({ status: "error", error: "forbidden" });
      expect(await settingsDoc("stats")).toBeNull();
    });

    it("the saving admin comes only from the session: an actor in the input is ignored", async () => {
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["settings"]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      const result = await run(cookie, {
        ...payload("stats"),
        updatedBy: "boss@example.test",
        actorEmail: "boss@example.test",
        email: "boss@example.test",
      });
      expect(result).toMatchObject({ status: "success" });
      expect(await settingsDoc("stats")).toMatchObject({ updatedBy: CM_EMAIL });
    });

    it("an unknown group is invalid and writes nothing", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      // "gallery" left the group engine in 007: only src/lib/gallery/store.ts may write that document.
      for (const group of ["users", "__proto__", "", "constructor", "gallery"]) {
        expect(await run(cookie, { group, expectedVersion: 0, data: {} })).toMatchObject({ status: "error", error: "invalid" });
      }
      const mongoose = (await import("mongoose")).default;
      expect(await mongoose.connection.db!.collection("settings").countDocuments()).toBe(0);
    });

    it("a bad expectedVersion is invalid", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      for (const expectedVersion of [-1, 1.5, Number.NaN, "0" as unknown as number]) {
        expect(await run(cookie, { group: "stats", expectedVersion, data: defaultsFor(GROUPS.stats) })).toMatchObject({
          status: "error",
          error: "invalid",
        });
      }
    });

    it("a successful save revalidates the settings cache tags and the site, and reports the new version", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      const first = await run(cookie, payload("stats"));
      expect(first).toMatchObject({ status: "success", version: 1 });
      expect(revalidateTag).toHaveBeenCalledWith("settings", { expire: 0 });
      expect(revalidateTag).toHaveBeenCalledWith("settings:stats", { expire: 0 });
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");

      const second = await run(cookie, { group: "stats", expectedVersion: 1, data: { ...defaultsFor(GROUPS.stats), students: 5 } });
      expect(second).toMatchObject({ status: "success", version: 2, data: { students: 5 } });
    });

    it("a stale version → conflict and no revalidation", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      await run(cookie, payload("stats"));
      revalidateTag.mockClear();
      expect(await run(cookie, payload("stats"))).toEqual({ status: "error", error: "conflict" });
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("invalid data comes back with field errors, and the group stays unsaved", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      const result = await run(cookie, { group: "stats", expectedVersion: 0, data: { ...defaultsFor(GROUPS.stats), books: -1 } });
      expect(result).toMatchObject({ status: "error", error: "invalid", fields: { books: expect.any(String) } });
      expect(await settingsDoc("stats")).toBeNull();
    });
  },
);
