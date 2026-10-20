// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { getTestSessionCookie, seedTestAdmin, seedTestContentManager } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";
import { PERMISSION_KEYS, type Permission } from "@/lib/permissions";
import { defaultsFor, mergeWithDefaults } from "@/lib/settings/defaults";
import { panelFingerprint } from "@/lib/settings/fingerprint";
import { toLiveValue } from "@/lib/settings/items";
import { PANELS, PANEL_KEYS, type PanelKey } from "@/lib/settings/panels";
import { GROUPS } from "@/lib/settings/registry";

// Real Better Auth against a remote test database: the first case pays for
// module loading and index creation.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const PASSWORD = "correct-horse-battery-staple";
const ADMIN_EMAIL = "settings-admin@example.test";
const CM_EMAIL = "settings-manager@example.test";

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();

type ActionName = "saveSettingsPanel" | "savePagesPanel";
type Input = { panel: string; expectedFingerprint: string; data: unknown } & Record<string, unknown>;

/** Runs the real Server Action as the holder of `cookie` (null → no session). */
async function run(action: ActionName, cookie: string | null, input: Input) {
  vi.doMock("next/headers", () => mockNextHeaders(new Headers(cookie ? { cookie } : {})));
  vi.doMock("next/cache", () => ({ revalidatePath, revalidateTag, unstable_cache: (fn: unknown) => fn }));
  vi.resetModules();
  const actions = await import("./actions");
  return actions[action](input);
}

async function settingsDoc(group: string) {
  const mongoose = (await import("mongoose")).default;
  return mongoose.connection.db!.collection("settings").findOne({ _id: group as never });
}

const GROUP_PANELS = PANEL_KEYS.filter((key) => PANELS[key].source.kind === "group");

function groupOf(key: PanelKey) {
  const source = PANELS[key].source;
  if (source.kind !== "group") throw new Error("not a group panel");
  return source;
}

/** The panel's fields and fingerprint as a never-saved group shows them. */
function fresh(key: PanelKey, overrides: Record<string, unknown> = {}): Input {
  const { group, fields } = groupOf(key);
  const def = GROUPS[group];
  const live = toLiveValue(def, mergeWithDefaults(def, defaultsFor(def)));
  const data = { ...Object.fromEntries(fields.map((field) => [field, live[field]])), ...overrides };
  return { panel: key, expectedFingerprint: panelFingerprint(fields, live), data };
}

const actionFor = (key: PanelKey): ActionName => (PANELS[key].saveAccess === "settings" ? "saveSettingsPanel" : "savePagesPanel");
const otherAction = (key: PanelKey): ActionName => (actionFor(key) === "saveSettingsPanel" ? "savePagesPanel" : "saveSettingsPanel");
const permissionOf = (action: ActionName): Permission => (action === "saveSettingsPanel" ? "settings" : "pages");

const hasLine = (spy: ReturnType<typeof vi.spyOn>, ...parts: string[]) =>
  spy.mock.calls.some(([line]) => parts.every((part) => String(line).includes(part)));

describeWithDb(
  "Settings panel saves (014): the three access cases (Constitution XI) for every panel",
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

    for (const key of GROUP_PANELS) {
      const action = actionFor(key);
      const permission = permissionOf(action);
      const { group } = groupOf(key);

      it(`${key} via ${action}: no session → unauthorized, nothing written`, async () => {
        expect(await run(action, null, fresh(key))).toEqual({ status: "error", error: "unauthorized" });
        expect(await settingsDoc(group)).toBeNull();
        expect(revalidateTag).not.toHaveBeenCalled();
      });

      it(`${key} via ${action}: every grant EXCEPT ${permission} → forbidden, nothing written, access_denied logged`, async () => {
        await seedTestContentManager(CM_EMAIL, PASSWORD, PERMISSION_KEYS.filter((p) => p !== permission));
        const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
        const info = vi.spyOn(console, "info");
        expect(await run(action, cookie, fresh(key))).toEqual({ status: "error", error: "forbidden" });
        expect(await settingsDoc(group)).toBeNull();
        expect(revalidateTag).not.toHaveBeenCalled();
        expect(hasLine(info, '"access_denied"', `"${permission}"`)).toBe(true);
      });

      it(`${key} via ${action}: a content manager with ${permission} only → saves`, async () => {
        await seedTestContentManager(CM_EMAIL, PASSWORD, [permission]);
        const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
        expect(await run(action, cookie, fresh(key))).toMatchObject({ status: "success", version: 1 });
        expect(await settingsDoc(group)).toMatchObject({ version: 1, updatedBy: CM_EMAIL });
      });

      it(`${key} via ${otherAction(key)}: holding that action's permission but not the panel's → forbidden, logged with the panel`, async () => {
        const other = otherAction(key);
        await seedTestContentManager(CM_EMAIL, PASSWORD, [permissionOf(other)]);
        const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
        const info = vi.spyOn(console, "info");
        expect(await run(other, cookie, fresh(key))).toEqual({ status: "error", error: "forbidden" });
        expect(await settingsDoc(group)).toBeNull();
        expect(hasLine(info, '"access_denied"', `"${key}"`)).toBe(true);
      });
    }

    it("a main admin saves through either action, for the panels that action accepts", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      expect(await run("saveSettingsPanel", cookie, fresh("contact"))).toMatchObject({ status: "success" });
      expect(await run("savePagesPanel", cookie, fresh("stats"))).toMatchObject({ status: "success" });
      // A main admin sending a panel to the wrong action is still refused: each action takes its own panels only.
      expect(await run("savePagesPanel", cookie, fresh("admission-window"))).toEqual({ status: "error", error: "forbidden" });
    });

    it("US2-5: a Pages-only save of the admission messages that also carries dates and classes stores the messages only", async () => {
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["pages"]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      const input = fresh("admission-messages", {
        announcement: "Open for Class 1",
        closedMessage: "Opening soon",
        opensOn: "2027-01-01",
        closesOn: "2027-03-31",
        classes: [{ id: "00000000-0000-4000-8000-0000000000aa", name: "Class 1" }],
      });
      expect(await run("savePagesPanel", cookie, input)).toMatchObject({
        status: "success",
        data: { announcement: "Open for Class 1", closedMessage: "Opening soon" },
      });
      const doc = await settingsDoc("admission");
      expect(doc?.data).toMatchObject({ announcement: "Open for Class 1", closedMessage: "Opening soon", opensOn: "", closesOn: "", classes: [] });
    });

    it("US2-5: a Pages-only user cannot change the dates or classes by any action", async () => {
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["pages"]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      const dates = fresh("admission-window", { opensOn: "2027-01-01", closesOn: "2027-03-31" });
      const classes = fresh("admission-classes", { classes: [{ id: "00000000-0000-4000-8000-0000000000aa", name: "Class 1" }] });
      expect(await run("saveSettingsPanel", cookie, dates)).toEqual({ status: "error", error: "forbidden" });
      expect(await run("savePagesPanel", cookie, dates)).toEqual({ status: "error", error: "forbidden" });
      expect(await run("saveSettingsPanel", cookie, classes)).toEqual({ status: "error", error: "forbidden" });
      expect(await run("savePagesPanel", cookie, classes)).toEqual({ status: "error", error: "forbidden" });
      expect(await settingsDoc("admission")).toBeNull();
    });

    it("a user disabled while holding a live cookie → unauthorized, nothing written", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD, { disabledAt: new Date() });
      expect(await run("savePagesPanel", cookie, fresh("stats"))).toEqual({ status: "error", error: "unauthorized" });
      expect(await settingsDoc("stats")).toBeNull();
    });

    it("a grant removed after the form loaded → the save is refused, nothing changes", async () => {
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["pages"]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["news"]);
      expect(await run("savePagesPanel", cookie, fresh("stats"))).toEqual({ status: "error", error: "forbidden" });
      expect(await settingsDoc("stats")).toBeNull();
    });

    it("the saving admin comes only from the session: an actor in the input is ignored", async () => {
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["pages"]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      const result = await run("savePagesPanel", cookie, {
        ...fresh("stats"),
        updatedBy: "boss@example.test",
        actorEmail: "boss@example.test",
        email: "boss@example.test",
      });
      expect(result).toMatchObject({ status: "success", updatedBy: CM_EMAIL });
      expect(await settingsDoc("stats")).toMatchObject({ updatedBy: CM_EMAIL });
    });

    it("an unknown panel, the gallery, or a group key is invalid and writes nothing", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      const fingerprint = fresh("stats").expectedFingerprint;
      for (const panel of ["users", "__proto__", "", "constructor", "photo-gallery", "admission", "gallery"]) {
        for (const action of ["saveSettingsPanel", "savePagesPanel"] as const) {
          expect(await run(action, cookie, { panel, expectedFingerprint: fingerprint, data: {} })).toMatchObject({ status: "error", error: "invalid" });
        }
      }
      const mongoose = (await import("mongoose")).default;
      expect(await mongoose.connection.db!.collection("settings").countDocuments()).toBe(0);
    });

    it("a fingerprint that is not 32 hex characters is invalid", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      for (const expectedFingerprint of ["", "0", "z".repeat(32), "A".repeat(32), 7 as unknown as string]) {
        expect(await run("savePagesPanel", cookie, { ...fresh("stats"), expectedFingerprint })).toMatchObject({ status: "error", error: "invalid" });
      }
      expect(await settingsDoc("stats")).toBeNull();
    });

    it("success revalidates the settings tags and the site, logs the group and panel, and returns the new fingerprint", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      const info = vi.spyOn(console, "info");
      const first = await run("savePagesPanel", cookie, fresh("stats", { students: 5 }));
      expect(first).toMatchObject({ status: "success", version: 1, data: { students: 5 } });
      expect(revalidateTag).toHaveBeenCalledWith("settings", { expire: 0 });
      expect(revalidateTag).toHaveBeenCalledWith("settings:stats", { expire: 0 });
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(hasLine(info, '"settings_saved"', '"group":"stats"', '"panel":"stats"', ADMIN_EMAIL)).toBe(true);

      if (first.status !== "success") throw new Error("expected success");
      const second = await run("savePagesPanel", cookie, { panel: "stats", expectedFingerprint: first.fingerprint, data: { ...first.data, students: 6 } });
      expect(second).toMatchObject({ status: "success", version: 2, data: { students: 6 } });
    });

    it("a stale fingerprint → conflict and no revalidation", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      await run("savePagesPanel", cookie, fresh("stats", { students: 5 }));
      revalidateTag.mockClear();
      expect(await run("savePagesPanel", cookie, fresh("stats", { students: 9 }))).toEqual({ status: "error", error: "conflict" });
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("020 admission window: Closes on before Opens on is refused, and nothing is written", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      expect(await run("saveSettingsPanel", cookie, fresh("admission-window", { opensOn: "2027-03-31", closesOn: "2027-01-01" }))).toMatchObject({
        status: "error",
        error: "invalid",
        fields: { closesOn: expect.any(String) },
      });
      expect(await settingsDoc("admission")).toBeNull();
    });

    it("020 admission messages: a text over 160 characters is refused", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      expect(await run("savePagesPanel", cookie, fresh("admission-messages", { announcement: "a".repeat(161) }))).toMatchObject({
        status: "error",
        error: "invalid",
        fields: { announcement: expect.any(String) },
      });
      expect(await settingsDoc("admission")).toBeNull();
    });

    it("the old whole-group action is gone", async () => {
      const actions = (await import("./actions")) as Record<string, unknown>;
      expect(actions.saveSettingsGroup).toBeUndefined();
      expect(Object.keys(actions).sort()).toEqual(["savePagesPanel", "saveSettingsPanel"]);
    });
  },
);
