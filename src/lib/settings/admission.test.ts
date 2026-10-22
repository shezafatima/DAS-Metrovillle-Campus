// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { settingsCopy } from "@/content/admin";
import { defaultsFor } from "./defaults";
import { GROUPS } from "./registry";
import { toLiveValue } from "./items";
import { parseGroup } from "./schema";

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/db", () => ({ connectDb: async () => undefined }));
vi.mock("@/models/settings", () => ({ Settings: { findById: () => ({ lean: async () => null }) } }));

const { toPublicShape } = await import("./public");

const def = GROUPS.admission;
const valid = (o: Record<string, unknown> = {}) => ({ opensOn: "", closesOn: "", announcement: "", closedMessage: "", classes: [], ...o });

describe("Settings group: admission (020 FR-008)", () => {
  it("starts with every field empty (so admissions read as closed)", () => {
    expect(defaultsFor(def)).toEqual({ opensOn: "", closesOn: "", announcement: "", closedMessage: "", classes: [] });
  });

  it("saves a full window", () => {
    const r = parseGroup(def, valid({ opensOn: "2027-01-01", closesOn: "2027-03-31", announcement: "Admissions are now open", closedMessage: "Opening soon" }));
    expect(r).toEqual({ ok: true, data: { opensOn: "2027-01-01", closesOn: "2027-03-31", announcement: "Admissions are now open", closedMessage: "Opening soon", classes: [] } });
  });

  it("refuses Closes on before Opens on, on the Closes on field", () => {
    expect(parseGroup(def, valid({ opensOn: "2027-03-31", closesOn: "2027-01-01" }))).toEqual({
      ok: false,
      fields: { closesOn: settingsCopy.errors.closesBeforeOpens },
    });
  });

  it("refuses texts over 160 characters and keeps 160", () => {
    expect(parseGroup(def, valid({ announcement: "a".repeat(160) })).ok).toBe(true);
    expect(parseGroup(def, valid({ announcement: "a".repeat(161) }))).toMatchObject({ ok: false, fields: { announcement: settingsCopy.errors.maxLength(160) } });
    expect(parseGroup(def, valid({ closedMessage: "a".repeat(161) }))).toMatchObject({ ok: false, fields: { closedMessage: settingsCopy.errors.maxLength(160) } });
  });

  it("stores a whitespace-only text as empty", () => {
    const r = parseGroup(def, valid({ announcement: "   ", closedMessage: "\t" }));
    expect(r.ok && r.data).toMatchObject({ announcement: "", closedMessage: "" });
  });
});

describe("toPublicShape('admission')", () => {
  it("returns the four strings, empty when missing", () => {
    expect(toPublicShape("admission", { opensOn: "2027-01-01", closesOn: "2027-03-31", announcement: "Open", closedMessage: "" })).toEqual({
      opensOn: "2027-01-01",
      closesOn: "2027-03-31",
      announcement: "Open",
      closedMessage: "",
      classes: [],
    });
    expect(toPublicShape("admission", {})).toEqual({ opensOn: "", closesOn: "", announcement: "", closedMessage: "", classes: [] });
  });

  it("lists the classes in saved order, trimmed, without empty ones; an old item has no levelId, so it reads as not linked", () => {
    const classes = [{ name: "Playgroup" }, { name: " Nursery " }, { name: "" }, { name: "Class 1", levelId: " lvl-1 " }];
    expect(toPublicShape("admission", { classes }).classes).toEqual([
      { levelId: "", name: "Playgroup" },
      { levelId: "", name: "Nursery" },
      { levelId: "lvl-1", name: "Class 1" },
    ]);
  });

  it("leaves deleted items out (the live value has none)", () => {
    const def = GROUPS.admission;
    const live = toLiveValue(def, {
      ...defaultsFor(def),
      classes: [
        { id: "a", name: "Playgroup", deletedAt: null },
        { id: "b", name: "Removed", deletedAt: new Date() },
      ],
    });
    expect(toPublicShape("admission", live).classes).toEqual([{ levelId: "", name: "Playgroup" }]);
  });
});

describe("admission classes items (014b)", () => {
  const item = (o: Record<string, unknown> = {}) => ({ id: crypto.randomUUID(), name: "Class 1", ...o });

  it("an item stored before 014b has no levelId and reads as not linked (empty)", () => {
    const r = parseGroup(def, valid({ classes: [item()] }));
    expect(r).toMatchObject({ ok: true, data: { classes: [{ name: "Class 1", levelId: "" }] } });
  });

  it("keeps a levelId", () => {
    expect(parseGroup(def, valid({ classes: [item({ levelId: "lvl-1" })] }))).toMatchObject({ ok: true, data: { classes: [{ levelId: "lvl-1" }] } });
  });

  it("refuses the same class level ticked twice, but allows many not-linked items", () => {
    expect(parseGroup(def, valid({ classes: [item({ name: "A", levelId: "lvl-1" }), item({ name: "B", levelId: "lvl-1" })] }))).toMatchObject({
      ok: false,
      fields: { "classes.1.levelId": settingsCopy.errors.classLevelLinkDuplicate },
    });
    expect(parseGroup(def, valid({ classes: [item({ name: "A" }), item({ name: "B" })] })).ok).toBe(true);
  });

  it("accepts a name of 60 characters and refuses 61", () => {
    expect(parseGroup(def, valid({ classes: [item({ name: "a".repeat(60) })] })).ok).toBe(true);
    expect(parseGroup(def, valid({ classes: [item({ name: "a".repeat(61) })] }))).toMatchObject({ ok: false, fields: { "classes.0.name": settingsCopy.errors.maxLength(60) } });
  });

  it("still refuses a repeated class name", () => {
    expect(parseGroup(def, valid({ classes: [item({ name: "Class 1" }), item({ name: " class 1 " })] }))).toMatchObject({
      ok: false,
      fields: { "classes.1.name": settingsCopy.errors.classDuplicate },
    });
  });
});
