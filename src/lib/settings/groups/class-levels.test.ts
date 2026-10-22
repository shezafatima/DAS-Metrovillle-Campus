// @vitest-environment node
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { fieldErrors } from "@/lib/validation/field-errors";
import { settingsCopy } from "@/content/admin";
import { defaultsFor, mergeWithDefaults } from "../defaults";
import { GROUPS } from "../registry";
import { schemaFor } from "../schema";

const def = GROUPS.classLevels;
const row = (overrides: Record<string, unknown> = {}) => ({ id: randomUUID(), name: "Playgroup", ageRule: "2½ to 3½ years", ...overrides });
const parse = (levels: unknown[], ageReferenceDate = "07-31") => {
  const result = schemaFor(def).safeParse({ ageReferenceDate, levels });
  return result.success ? { ok: true as const, data: result.data as { ageReferenceDate: string; levels: Record<string, unknown>[] } } : { ok: false as const, fields: fieldErrors(result.error) };
};

describe("the classLevels group (014b)", () => {
  it("starts with the 31 July reference date and no rows, so the section is hidden until the client supplies them", () => {
    expect(defaultsFor(def)).toEqual({ ageReferenceDate: "07-31", levels: [] });
    expect(mergeWithDefaults(def, undefined)).toEqual({ ageReferenceDate: "07-31", levels: [] });
  });

  it("accepts 30 rows and refuses a 31st", () => {
    expect(parse(Array.from({ length: 30 }, (_, i) => row({ name: `Level ${i}` }))).ok).toBe(true);
    expect(parse(Array.from({ length: 31 }, (_, i) => row({ name: `Level ${i}` })))).toMatchObject({ ok: false, fields: { levels: settingsCopy.errors.tooMany(30) } });
  });

  it("accepts a name of 60 characters and refuses 61", () => {
    expect(parse([row({ name: "a".repeat(60) })]).ok).toBe(true);
    expect(parse([row({ name: "a".repeat(61) })])).toMatchObject({ ok: false, fields: { "levels.0.name": settingsCopy.errors.maxLength(60) } });
  });

  it("accepts an age rule of 80 characters and refuses 81", () => {
    expect(parse([row({ ageRule: "a".repeat(80) })]).ok).toBe(true);
    expect(parse([row({ ageRule: "a".repeat(81) })])).toMatchObject({ ok: false, fields: { "levels.0.ageRule": settingsCopy.errors.maxLength(80) } });
  });

  it("refuses a duplicate name, ignoring case and repeated spaces, naming the row and the reason", () => {
    const result = parse([row({ name: "Class 1" }), row({ name: " class  1 " })]);
    expect(result).toEqual({ ok: false, fields: { "levels.1.name": settingsCopy.errors.classLevelNameDuplicate("class 1") } });
    expect(settingsCopy.errors.classLevelNameDuplicate("class 1")).toContain("registration matches classes by name");
  });

  it("allows the same age rule on several rows", () => {
    expect(parse([row({ name: "Class 1", ageRule: "6 years" }), row({ name: "Class 2", ageRule: "6 years" })]).ok).toBe(true);
  });

  it("refuses an empty or whitespace-only name or age rule", () => {
    expect(parse([row({ name: "" })])).toMatchObject({ ok: false, fields: { "levels.0.name": settingsCopy.errors.required } });
    expect(parse([row({ name: "   " })])).toMatchObject({ ok: false, fields: { "levels.0.name": settingsCopy.errors.required } });
    expect(parse([row({ ageRule: "" })])).toMatchObject({ ok: false, fields: { "levels.0.ageRule": settingsCopy.errors.required } });
    expect(parse([row({ ageRule: "  \t " })])).toMatchObject({ ok: false, fields: { "levels.0.ageRule": settingsCopy.errors.required } });
  });

  it("accepts a real day-month and refuses an impossible one", () => {
    expect(parse([], "04-01").ok).toBe(true);
    expect(parse([], "02-29").ok).toBe(true);
    expect(parse([], "04-31")).toMatchObject({ ok: false, fields: { ageReferenceDate: settingsCopy.errors.dayMonth } });
    expect(parse([], "")).toMatchObject({ ok: false, fields: { ageReferenceDate: expect.any(String) } });
  });

  it("keeps markup in a name as plain text", () => {
    expect(parse([row({ name: "<b>Class</b>" })])).toMatchObject({ ok: true, data: { levels: [{ name: "<b>Class</b>" }] } });
  });
});
