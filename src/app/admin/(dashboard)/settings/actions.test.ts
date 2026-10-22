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

/** Runs a confirm action ("Mark as confirmed by client", 014b) as the holder of `cookie`. */
async function runConfirm(action: "confirmSettingsPanel" | "confirmPagesPanel", cookie: string | null, input: { panel: string }) {
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
  ["user", "account", "session", "settings", "settingsChanges", "throttles"],
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

    // ── 014b: Portal links ────────────────────────────────────────────

    const linkItem = (url: string, label = "LMS App") => ({ id: crypto.randomUUID(), label, url });

    it("portal-links: a Settings user saves links, and an http:// address is accepted", async () => {
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["settings"]);
      const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      const links = [linkItem("https://lms.example.org/"), linkItem("http://203.0.113.5/login", "Student Login")];
      expect(await run("saveSettingsPanel", cookie, fresh("portal-links", { links }))).toMatchObject({ status: "success", version: 1 });
      const doc = await settingsDoc("portalLinks");
      expect((doc?.data as { links: { url: string }[] }).links.map((link) => link.url)).toEqual(["https://lms.example.org/", "http://203.0.113.5/login"]);
    });

    it.each(["javascript:alert(1)", "data:text/html,x", "/portal/x", "www.example.org", "https//broken", "https://u:p@x.org"])(
      "portal-links: an unsafe or malformed address (%s) is invalid at its row, and nothing is written",
      async (url) => {
        await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
        const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
        const result = await run("saveSettingsPanel", cookie, fresh("portal-links", { links: [linkItem("https://ok.example.org/"), linkItem(url)] }));
        expect(result).toMatchObject({ status: "error", error: "invalid", fields: { "links.1.url": expect.any(String) } });
        expect(await settingsDoc("portalLinks")).toBeNull();
      },
    );

    it("portal-links: saving revalidates the footer's settings tag", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      await run("saveSettingsPanel", cookie, fresh("portal-links", { links: [linkItem("https://lms.example.org/")] }));
      expect(revalidateTag).toHaveBeenCalledWith("settings:portalLinks", { expire: 0 });
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("portal-links: removing a link keeps its previous value in the change record (spec FR-007)", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      const keep = linkItem("https://keep.example.org/", "Keep");
      const drop = linkItem("https://drop.example.org/", "Drop");
      const first = await run("saveSettingsPanel", cookie, fresh("portal-links", { links: [keep, drop] }));
      if (first.status !== "success") throw new Error("expected success");
      await run("saveSettingsPanel", cookie, { panel: "portal-links", expectedFingerprint: first.fingerprint, data: { links: [keep] } });
      const mongoose = (await import("mongoose")).default;
      const entries = await mongoose.connection.db!.collection("settingsChanges").find({ group: "portalLinks" }).toArray();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ panel: "portal-links", actorEmail: ADMIN_EMAIL });
      expect(entries[0].removed).toMatchObject([{ path: "links.1", label: "Drop", value: { id: drop.id, label: "Drop", url: "https://drop.example.org/" } }]);
    });

    // ── 014b: Class Levels and the open-classes checklist ───────────────

    const level = (name: string, ageRule = "3 to 4 years") => ({ id: crypto.randomUUID(), name, ageRule });

    it("class-levels: a Pages user saves rows and the reference date; a Settings-only user cannot", async () => {
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["pages"]);
      const pages = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      const levels = [level("Playgroup", "2½ to 3½ years"), level("Class 1", "5½ to 6½ years")];
      expect(await run("savePagesPanel", pages, fresh("class-levels", { ageReferenceDate: "04-01", levels }))).toMatchObject({
        status: "success",
        data: { ageReferenceDate: "04-01" },
      });
      expect(await settingsDoc("classLevels")).toMatchObject({ version: 1, data: { ageReferenceDate: "04-01" } });

      await seedTestContentManager(CM_EMAIL, PASSWORD, ["settings"]);
      const settingsOnly = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      const input = fresh("class-levels", { levels: [level("Hacked")] });
      expect(await run("saveSettingsPanel", settingsOnly, input)).toEqual({ status: "error", error: "forbidden" });
      expect(await run("savePagesPanel", settingsOnly, input)).toEqual({ status: "error", error: "forbidden" });
    });

    it("class-levels: a duplicate name and an impossible date are invalid and nothing is written", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      expect(await run("savePagesPanel", cookie, fresh("class-levels", { levels: [level("Class 1"), level(" class  1 ")] }))).toMatchObject({
        status: "error",
        error: "invalid",
        fields: { "levels.1.name": expect.stringContaining("registration matches classes by name") },
      });
      expect(await run("savePagesPanel", cookie, fresh("class-levels", { ageReferenceDate: "04-31" }))).toMatchObject({
        status: "error",
        error: "invalid",
        fields: { ageReferenceDate: expect.any(String) },
      });
      expect(await settingsDoc("classLevels")).toBeNull();
    });

    it("admission-classes: ticking a live level saves it; a level deleted since the form loaded is a conflict", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      const playgroup = level("Playgroup");
      const class1 = level("Class 1");
      const saved = await run("savePagesPanel", cookie, fresh("class-levels", { levels: [playgroup, class1] }));
      if (saved.status !== "success") throw new Error("expected success");

      const tick = (target: { id: string; name: string }) => ({ id: crypto.randomUUID(), name: target.name, levelId: target.id });
      expect(await run("saveSettingsPanel", cookie, fresh("admission-classes", { classes: [tick(playgroup)] }))).toMatchObject({ status: "success", version: 1 });

      // The Pages user deletes Class 1 while the checklist (loaded earlier) still offers it.
      await run("savePagesPanel", cookie, { panel: "class-levels", expectedFingerprint: saved.fingerprint, data: { ageReferenceDate: "07-31", levels: [playgroup] } });
      const stale = await run("saveSettingsPanel", cookie, {
        ...fresh("admission-classes", { classes: [tick(playgroup), tick(class1)] }),
        expectedFingerprint: (await settingsDoc("admission").then((doc) => doc && panelFingerprint(["classes"], toLiveValue(GROUPS.admission, mergeWithDefaults(GROUPS.admission, doc.data as never))))) as string,
      });
      expect(stale).toEqual({ status: "error", error: "conflict" });
      const stored = (await settingsDoc("admission"))?.data as { classes: { levelId: string; deletedAt: unknown }[] };
      expect(stored.classes.filter((item) => !item.deletedAt).map((item) => item.levelId)).toEqual([playgroup.id]);
    });

    // ── 014b: Syllabi ───────────────────────────────────────────────────

    const syllabusGroup = (topics: string[], o: Record<string, unknown> = {}) => ({ id: crypto.randomUUID(), heading: "", intro: "", topics, ...o });
    const syllabusSubject = (name: string, groups: ReturnType<typeof syllabusGroup>[]) => ({ id: crypto.randomUUID(), name, groups });
    const syllabusLevel = (name: string, subjects: ReturnType<typeof syllabusSubject>[]) => ({ id: crypto.randomUUID(), name, subjects });

    it("syllabi: a Pages user saves levels with subjects, groups and topics; a Settings-only user cannot", async () => {
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["pages"]);
      const pages = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      const levels = [syllabusLevel("Nursery", [syllabusSubject("English", [syllabusGroup(["Alphabet", "Phonics"], { heading: "Reading", intro: "First.\n\nSecond." })])])];
      expect(await run("savePagesPanel", pages, fresh("syllabi", { levels }))).toMatchObject({ status: "success", version: 1 });
      const doc = await settingsDoc("syllabi");
      const stored = (doc?.data as { levels: { name: string; subjects: { groups: { topics: string[]; intro: string }[] }[] }[] }).levels;
      expect(stored[0].name).toBe("Nursery");
      expect(stored[0].subjects[0].groups[0]).toMatchObject({ topics: ["Alphabet", "Phonics"], intro: "First.\n\nSecond." });

      await seedTestContentManager(CM_EMAIL, PASSWORD, ["settings"]);
      const settingsOnly = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      expect(await run("saveSettingsPanel", settingsOnly, fresh("syllabi", { levels }))).toEqual({ status: "error", error: "forbidden" });
      expect(await run("savePagesPanel", settingsOnly, fresh("syllabi", { levels }))).toEqual({ status: "error", error: "forbidden" });
    });

    it("syllabi: more than 3,000 topics in all is invalid, and nothing is written", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      const topics = Array.from({ length: 100 }, (_, i) => `t${i}`);
      const full = () => syllabusLevel("L", [syllabusSubject("S", Array.from({ length: 10 }, () => syllabusGroup(topics)))]);
      const levels = [full(), full(), full(), syllabusLevel("One more", [syllabusSubject("S", [syllabusGroup(["x"])])])];
      expect(await run("savePagesPanel", cookie, fresh("syllabi", { levels }))).toMatchObject({ status: "error", error: "invalid", fields: { levels: expect.stringContaining("3,000") } });
      expect(await settingsDoc("syllabi")).toBeNull();
    });

    it("syllabi: a topic over 200 characters, a 101st topic, and a group with nothing in it are each invalid at their own field", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      const one = (g: ReturnType<typeof syllabusGroup>) => [syllabusLevel("L", [syllabusSubject("S", [g])])];
      expect(await run("savePagesPanel", cookie, fresh("syllabi", { levels: one(syllabusGroup(["a".repeat(201)])) }))).toMatchObject({
        error: "invalid",
        fields: { "levels.0.subjects.0.groups.0.topics": expect.stringContaining("Line 1") },
      });
      expect(await run("savePagesPanel", cookie, fresh("syllabi", { levels: one(syllabusGroup(Array.from({ length: 101 }, (_, i) => `t${i}`))) }))).toMatchObject({
        error: "invalid",
        fields: { "levels.0.subjects.0.groups.0.topics": expect.any(String) },
      });
      expect(await run("savePagesPanel", cookie, fresh("syllabi", { levels: one(syllabusGroup([])) }))).toMatchObject({
        error: "invalid",
        fields: { "levels.0.subjects.0.groups.0.intro": expect.any(String) },
      });
      expect(await settingsDoc("syllabi")).toBeNull();
    });

    it("syllabi: removing a subject keeps its previous value in the change record; reordering levels keeps none", async () => {
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      const english = syllabusSubject("English", [syllabusGroup(["Alphabet"])]);
      const maths = syllabusSubject("Maths", [syllabusGroup(["Counting"])]);
      const a = syllabusLevel("Nursery", [english, maths]);
      const b = syllabusLevel("Class 1", [syllabusSubject("English", [syllabusGroup(["Reading"])])]);
      const first = await run("savePagesPanel", cookie, fresh("syllabi", { levels: [a, b] }));
      if (first.status !== "success") throw new Error("expected success");
      const second = await run("savePagesPanel", cookie, { panel: "syllabi", expectedFingerprint: first.fingerprint, data: { levels: [b, a] } });
      if (second.status !== "success") throw new Error("expected success");

      const mongoose = (await import("mongoose")).default;
      const entries = () => mongoose.connection.db!.collection("settingsChanges").find({ group: "syllabi" }).toArray();
      expect(await entries()).toHaveLength(0);

      await run("savePagesPanel", cookie, { panel: "syllabi", expectedFingerprint: second.fingerprint, data: { levels: [b, { ...a, subjects: [english] }] } });
      const recorded = await entries();
      expect(recorded).toHaveLength(1);
      expect(recorded[0].removed).toMatchObject([{ path: "levels.1.subjects.1", label: "Nursery · Maths", value: { id: maths.id, name: "Maths" } }]);
    });

    // ── 014b: Examination ───────────────────────────────────────────────

    it("examination: a Pages user saves blocks; a Settings-only user cannot; a body over 3,000 characters is invalid", async () => {
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["pages"]);
      const pages = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      const block = (heading: string, body: string) => ({ id: crypto.randomUUID(), heading, body });
      const blocks = [block("Nursery, Prep", "All assessments are informal."), block("Grade 1–7", "Mid-year.\n\nAnnual.")];
      expect(await run("savePagesPanel", pages, fresh("examination", { blocks }))).toMatchObject({ status: "success", version: 1 });
      expect((await settingsDoc("examination"))?.data).toMatchObject({ blocks: [{ heading: "Nursery, Prep" }, { heading: "Grade 1–7", body: "Mid-year.\n\nAnnual." }] });

      expect(await run("savePagesPanel", pages, fresh("examination", { blocks: [block("Too long", "b".repeat(3001))] }))).toMatchObject({
        status: "error",
        error: "invalid",
        fields: { "blocks.0.body": expect.any(String) },
      });

      await seedTestContentManager(CM_EMAIL, PASSWORD, ["settings"]);
      const settingsOnly = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      expect(await run("saveSettingsPanel", settingsOnly, fresh("examination", { blocks }))).toEqual({ status: "error", error: "forbidden" });
      expect(await run("savePagesPanel", settingsOnly, fresh("examination", { blocks }))).toEqual({ status: "error", error: "forbidden" });
    });

    // ── 014b: "Mark as confirmed by client" ──────────────────────────────

    async function seedPending(group: string, data: Record<string, unknown>) {
      const mongoose = (await import("mongoose")).default;
      await mongoose.connection.db!.collection("settings").insertOne({
        _id: group as never,
        data,
        version: 2,
        updatedBy: "system:014b-seed",
        updatedAt: new Date(),
        pendingConfirmation: { source: "das.edu.pk /x", seededAt: new Date("2026-10-19T10:00:00Z") },
      });
    }
    const isPending = async (group: string) => Boolean((await settingsDoc(group))?.pendingConfirmation);

    const CONFIRMS = [
      { action: "confirmPagesPanel", permission: "pages", panel: "syllabi", group: "syllabi", data: { levels: [] } },
      { action: "confirmPagesPanel", permission: "pages", panel: "examination", group: "examination", data: { blocks: [] } },
      { action: "confirmSettingsPanel", permission: "settings", panel: "portal-links", group: "portalLinks", data: { links: [] } },
    ] as const;

    for (const { action, permission, panel, group, data } of CONFIRMS) {
      it(`${panel} via ${action}: no session → unauthorized, still pending`, async () => {
        await seedPending(group, data);
        expect(await runConfirm(action, null, { panel })).toEqual({ status: "error", error: "unauthorized" });
        expect(await isPending(group)).toBe(true);
      });

      it(`${panel} via ${action}: every grant EXCEPT ${permission} → forbidden, still pending, access_denied logged`, async () => {
        await seedPending(group, data);
        await seedTestContentManager(CM_EMAIL, PASSWORD, PERMISSION_KEYS.filter((p) => p !== permission));
        const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
        const info = vi.spyOn(console, "info");
        expect(await runConfirm(action, cookie, { panel })).toEqual({ status: "error", error: "forbidden" });
        expect(await isPending(group)).toBe(true);
        expect(hasLine(info, '"access_denied"', `"${permission}"`)).toBe(true);
      });

      it(`${panel} via ${action}: a content manager with ${permission} only → cleared, and a second call changes nothing`, async () => {
        await seedPending(group, data);
        await seedTestContentManager(CM_EMAIL, PASSWORD, [permission]);
        const cookie = await getTestSessionCookie(CM_EMAIL, PASSWORD);
        const info = vi.spyOn(console, "info");
        expect(await runConfirm(action, cookie, { panel })).toEqual({ status: "success", changed: true });
        expect(await isPending(group)).toBe(false);
        expect(await settingsDoc(group)).toMatchObject({ version: 2, updatedBy: "system:014b-seed" });
        expect(hasLine(info, '"settings_confirmed"', `"${group}"`, CM_EMAIL)).toBe(true);
        info.mockClear();
        expect(await runConfirm(action, cookie, { panel })).toEqual({ status: "success", changed: false });
        expect(hasLine(info, '"settings_confirmed"')).toBe(false);
      });
    }

    it("a panel of the other permission is forbidden and logged with the panel: Pages cannot confirm Portal links, Settings cannot confirm Syllabi", async () => {
      await seedPending("portalLinks", { links: [] });
      await seedPending("syllabi", { levels: [] });
      await seedTestContentManager(CM_EMAIL, PASSWORD, ["pages"]);
      const pages = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      const info = vi.spyOn(console, "info");
      expect(await runConfirm("confirmPagesPanel", pages, { panel: "portal-links" })).toEqual({ status: "error", error: "forbidden" });
      expect(hasLine(info, '"access_denied"', '"portal-links"')).toBe(true);
      expect(await isPending("portalLinks")).toBe(true);

      await seedTestContentManager(CM_EMAIL, PASSWORD, ["settings"]);
      const settings = await getTestSessionCookie(CM_EMAIL, PASSWORD);
      expect(await runConfirm("confirmSettingsPanel", settings, { panel: "syllabi" })).toEqual({ status: "error", error: "forbidden" });
      expect(await isPending("syllabi")).toBe(true);
    });

    it("an unknown panel, the gallery and a group key are invalid; nothing changes", async () => {
      await seedPending("examination", { blocks: [] });
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      for (const panel of ["users", "__proto__", "", "photo-gallery", "examination-group", "admission"]) {
        for (const action of ["confirmSettingsPanel", "confirmPagesPanel"] as const) {
          expect(await runConfirm(action, cookie, { panel })).toMatchObject({ status: "error", error: "invalid" });
        }
      }
      expect(await isPending("examination")).toBe(true);
    });

    it("a save never clears the pending notice; only confirming does", async () => {
      await seedPending("examination", { blocks: [] });
      await seedTestAdmin(ADMIN_EMAIL, PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, PASSWORD);
      const mongoose = (await import("mongoose")).default;
      const doc = await mongoose.connection.db!.collection("settings").findOne({ _id: "examination" as never });
      const fingerprint = panelFingerprint(["blocks"], toLiveValue(GROUPS.examination, mergeWithDefaults(GROUPS.examination, doc!.data as never)));
      const blocks = [{ id: crypto.randomUUID(), heading: "Edited", body: "Edited text." }];
      expect(await run("savePagesPanel", cookie, { panel: "examination", expectedFingerprint: fingerprint, data: { blocks } })).toMatchObject({ status: "success", version: 3 });
      expect(await isPending("examination")).toBe(true);
      expect(await runConfirm("confirmPagesPanel", cookie, { panel: "examination" })).toEqual({ status: "success", changed: true });
      expect(await isPending("examination")).toBe(false);
      expect(await settingsDoc("examination")).toMatchObject({ version: 3 });
    });

    it("the old whole-group action is gone", async () => {
      const actions = (await import("./actions")) as Record<string, unknown>;
      expect(actions.saveSettingsGroup).toBeUndefined();
      expect(Object.keys(actions).sort()).toEqual(["confirmPagesPanel", "confirmSettingsPanel", "savePagesPanel", "saveSettingsPanel"]);
    });
  },
);
