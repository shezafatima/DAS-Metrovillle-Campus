// @vitest-environment node
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { fieldErrors } from "@/lib/validation/field-errors";
import { settingsCopy } from "@/content/admin";
import { defaultsFor } from "../defaults";
import { GROUPS } from "../registry";
import { schemaFor } from "../schema";
import { SYLLABUS_MAX_TOPICS } from "./syllabi";

const def = GROUPS.syllabi;
const topics = (n: number, prefix = "t") => Array.from({ length: n }, (_, i) => `${prefix}${i}`);
const group = (o: Record<string, unknown> = {}) => ({ id: randomUUID(), heading: "", intro: "", topics: ["one"], ...o });
const subject = (o: Record<string, unknown> = {}) => ({ id: randomUUID(), name: "English", groups: [group()], ...o });
const level = (o: Record<string, unknown> = {}) => ({ id: randomUUID(), name: "Class 1", subjects: [subject()], ...o });
const parse = (levels: unknown[]) => {
  const result = schemaFor(def).safeParse({ levels });
  return result.success ? { ok: true as const, data: result.data as { levels: Record<string, unknown>[] } } : { ok: false as const, fields: fieldErrors(result.error) };
};
const many = <T,>(n: number, make: (i: number) => T) => Array.from({ length: n }, (_, i) => make(i));

describe("the syllabi group (014b)", () => {
  it("a never-saved group has no levels, so the section is hidden", () => {
    expect(defaultsFor(def)).toEqual({ levels: [] });
  });

  it("accepts 20 levels and refuses a 21st", () => {
    expect(parse(many(20, (i) => level({ name: `L${i}`, subjects: [] }))).ok).toBe(true);
    expect(parse(many(21, (i) => level({ name: `L${i}`, subjects: [] })))).toMatchObject({ ok: false, fields: { levels: settingsCopy.errors.tooMany(20) } });
  });

  it("accepts 10 subjects in a level and refuses an 11th", () => {
    expect(parse([level({ subjects: many(10, (i) => subject({ name: `S${i}` })) })]).ok).toBe(true);
    expect(parse([level({ subjects: many(11, (i) => subject({ name: `S${i}` })) })])).toMatchObject({ ok: false, fields: { "levels.0.subjects": settingsCopy.errors.tooMany(10) } });
  });

  it("accepts 20 groups in a subject and refuses a 21st", () => {
    expect(parse([level({ subjects: [subject({ groups: many(20, () => group()) })] })]).ok).toBe(true);
    expect(parse([level({ subjects: [subject({ groups: many(21, () => group()) })] })])).toMatchObject({
      ok: false,
      fields: { "levels.0.subjects.0.groups": settingsCopy.errors.tooMany(20) },
    });
  });

  it("accepts 100 topics in a group and refuses a 101st, naming the limit", () => {
    expect(parse([level({ subjects: [subject({ groups: [group({ topics: topics(100) })] })] })]).ok).toBe(true);
    expect(parse([level({ subjects: [subject({ groups: [group({ topics: topics(101) })] })] })])).toMatchObject({
      ok: false,
      fields: { "levels.0.subjects.0.groups.0.topics": settingsCopy.errors.tooManyLines(100) },
    });
  });

  it("accepts a topic of 200 characters and refuses 201, naming the line", () => {
    expect(parse([level({ subjects: [subject({ groups: [group({ topics: ["a".repeat(200)] })] })] })]).ok).toBe(true);
    expect(parse([level({ subjects: [subject({ groups: [group({ topics: ["ok", "a".repeat(201)] })] })] })])).toMatchObject({
      ok: false,
      fields: { "levels.0.subjects.0.groups.0.topics": settingsCopy.errors.lineTooLong(2, 200) },
    });
  });

  it("accepts a level and subject name of 60 characters and refuses 61", () => {
    expect(parse([level({ name: "a".repeat(60), subjects: [subject({ name: "b".repeat(60) })] })]).ok).toBe(true);
    expect(parse([level({ name: "a".repeat(61) })])).toMatchObject({ ok: false, fields: { "levels.0.name": settingsCopy.errors.maxLength(60) } });
    expect(parse([level({ subjects: [subject({ name: "b".repeat(61) })] })])).toMatchObject({ ok: false, fields: { "levels.0.subjects.0.name": settingsCopy.errors.maxLength(60) } });
  });

  it("accepts a group heading of 120 characters and an intro of 1500, and refuses one more of each", () => {
    expect(parse([level({ subjects: [subject({ groups: [group({ heading: "h".repeat(120), intro: "i".repeat(1500) })] })] })]).ok).toBe(true);
    expect(parse([level({ subjects: [subject({ groups: [group({ heading: "h".repeat(121) })] })] })])).toMatchObject({
      ok: false,
      fields: { "levels.0.subjects.0.groups.0.heading": settingsCopy.errors.maxLength(120) },
    });
    expect(parse([level({ subjects: [subject({ groups: [group({ intro: "i".repeat(1501) })] })] })])).toMatchObject({
      ok: false,
      fields: { "levels.0.subjects.0.groups.0.intro": settingsCopy.errors.maxLength(1500) },
    });
  });

  it("a group needs an intro or at least one topic", () => {
    const empty = parse([level({ subjects: [subject({ groups: [group({ intro: "", topics: [] })] })] })]);
    expect(empty).toEqual({ ok: false, fields: { "levels.0.subjects.0.groups.0.intro": settingsCopy.errors.groupNeedsContent } });
    expect(parse([level({ subjects: [subject({ groups: [group({ intro: "Only an intro", topics: [] })] })] })]).ok).toBe(true);
    expect(parse([level({ subjects: [subject({ groups: [group({ intro: "", topics: ["only a topic"] })] })] })]).ok).toBe(true);
  });

  it("refuses an empty or whitespace-only level or subject name", () => {
    expect(parse([level({ name: "" })])).toMatchObject({ ok: false, fields: { "levels.0.name": settingsCopy.errors.required } });
    expect(parse([level({ name: "   " })])).toMatchObject({ ok: false, fields: { "levels.0.name": settingsCopy.errors.required } });
    expect(parse([level({ subjects: [subject({ name: " \t " })] })])).toMatchObject({ ok: false, fields: { "levels.0.subjects.0.name": settingsCopy.errors.required } });
  });

  it("lets two levels, or two subjects of a level, share a name (the editor only warns)", () => {
    expect(parse([level({ name: "Class 1" }), level({ name: "class 1" })]).ok).toBe(true);
    expect(parse([level({ subjects: [subject({ name: "English" }), subject({ name: "english" })] })]).ok).toBe(true);
  });

  it(`caps the whole syllabus at ${SYLLABUS_MAX_TOPICS} topics, whatever the per-level limits allow`, () => {
    // 30 groups of 100 topics = 3000 across three levels of 10 groups each (2 subjects x 5 groups).
    const full = () => level({ subjects: many(2, () => subject({ groups: many(5, () => group({ topics: topics(100) })) })) });
    expect(parse(many(3, full)).ok).toBe(true);
    const over = parse([...many(3, full), level({ subjects: [subject({ groups: [group({ topics: ["one more"] })] })] })]);
    expect(over).toEqual({ ok: false, fields: { levels: settingsCopy.errors.tooManyTopics(SYLLABUS_MAX_TOPICS) } });
  });

  it("trims every topic and drops blank ones", () => {
    const result = parse([level({ subjects: [subject({ groups: [group({ topics: " a \n\n b " })] })] })]);
    expect(result.ok && (result.data.levels[0].subjects as { groups: { topics: string[] }[] }[])[0].groups[0].topics).toEqual(["a", "b"]);
  });

  it("keeps markup as plain text", () => {
    const result = parse([level({ name: "<b>Class</b>", subjects: [subject({ groups: [group({ topics: ["<script>alert(1)</script>"] })] })] })]);
    expect(result.ok && result.data.levels[0].name).toBe("<b>Class</b>");
  });
});
