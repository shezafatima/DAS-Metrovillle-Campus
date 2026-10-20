// @vitest-environment node
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { fieldErrors } from "@/lib/validation/field-errors";
import { settingsCopy } from "@/content/admin";
import { defaultsFor } from "../defaults";
import { GROUPS } from "../registry";
import { schemaFor } from "../schema";

const def = GROUPS.examination;
const block = (o: Record<string, unknown> = {}) => ({ id: randomUUID(), heading: "Nursery, Prep", body: "All assessments are informal.", ...o });
const parse = (blocks: unknown[]) => {
  const result = schemaFor(def).safeParse({ blocks });
  return result.success ? { ok: true as const, data: result.data as { blocks: Record<string, unknown>[] } } : { ok: false as const, fields: fieldErrors(result.error) };
};

describe("the examination group (014b)", () => {
  it("a never-saved group has no blocks, so the section is hidden", () => {
    expect(defaultsFor(def)).toEqual({ blocks: [] });
  });

  it("accepts 20 blocks and refuses a 21st", () => {
    expect(parse(Array.from({ length: 20 }, (_, i) => block({ heading: `H${i}` }))).ok).toBe(true);
    expect(parse(Array.from({ length: 21 }, (_, i) => block({ heading: `H${i}` })))).toMatchObject({ ok: false, fields: { blocks: settingsCopy.errors.tooMany(20) } });
  });

  it("accepts a heading of 120 characters and refuses 121", () => {
    expect(parse([block({ heading: "h".repeat(120) })]).ok).toBe(true);
    expect(parse([block({ heading: "h".repeat(121) })])).toMatchObject({ ok: false, fields: { "blocks.0.heading": settingsCopy.errors.maxLength(120) } });
  });

  it("accepts a body of 3,000 characters and refuses 3,001", () => {
    expect(parse([block({ body: "b".repeat(3000) })]).ok).toBe(true);
    expect(parse([block({ body: "b".repeat(3001) })])).toMatchObject({ ok: false, fields: { "blocks.0.body": settingsCopy.errors.maxLength(3000) } });
  });

  it("refuses an empty or whitespace-only heading or body", () => {
    expect(parse([block({ heading: "" })])).toMatchObject({ ok: false, fields: { "blocks.0.heading": settingsCopy.errors.required } });
    expect(parse([block({ heading: "   " })])).toMatchObject({ ok: false, fields: { "blocks.0.heading": settingsCopy.errors.required } });
    expect(parse([block({ body: "" })])).toMatchObject({ ok: false, fields: { "blocks.0.body": settingsCopy.errors.required } });
    expect(parse([block({ body: " \n \t " })])).toMatchObject({ ok: false, fields: { "blocks.0.body": settingsCopy.errors.required } });
  });

  it("keeps the blank lines between paragraphs and treats markup as plain text", () => {
    const result = parse([block({ body: "First.\n\nSecond <b>bold</b>." })]);
    expect(result.ok && result.data.blocks[0].body).toBe("First.\n\nSecond <b>bold</b>.");
  });
});
