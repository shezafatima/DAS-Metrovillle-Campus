// @vitest-environment node
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { fieldErrors } from "@/lib/validation/field-errors";
import { settingsCopy } from "@/content/admin";
import { defaultsFor, mergeWithDefaults } from "../defaults";
import { GROUPS } from "../registry";
import { schemaFor } from "../schema";

const def = GROUPS.portalLinks;
const link = (overrides: Record<string, unknown> = {}) => ({ id: randomUUID(), label: "LMS App", url: "https://lms.example.org/", ...overrides });
const parse = (links: unknown[]) => {
  const result = schemaFor(def).safeParse({ links });
  return result.success ? { ok: true as const, data: result.data as { links: Record<string, unknown>[] } } : { ok: false as const, fields: fieldErrors(result.error) };
};

describe("the portalLinks group (014b)", () => {
  it("is a list of links with a label and a web address", () => {
    const list = def.fields[0];
    expect(list).toMatchObject({ type: "list", key: "links", maxItems: 12 });
    if (list.type !== "list") throw new Error("expected a list");
    expect(list.itemFields.map((field) => field.key)).toEqual(["label", "url"]);
  });

  it("a never-saved group has no links, so the footer column is hidden", () => {
    expect(defaultsFor(def)).toEqual({ links: [] });
    expect(mergeWithDefaults(def, undefined)).toEqual({ links: [] });
  });

  it("accepts 12 links and refuses a 13th", () => {
    expect(parse(Array.from({ length: 12 }, (_, i) => link({ label: `Link ${i}` }))).ok).toBe(true);
    expect(parse(Array.from({ length: 13 }, (_, i) => link({ label: `Link ${i}` })))).toMatchObject({ ok: false, fields: { links: settingsCopy.errors.tooMany(12) } });
  });

  it("accepts a label of 40 characters and refuses 41", () => {
    expect(parse([link({ label: "a".repeat(40) })]).ok).toBe(true);
    expect(parse([link({ label: "a".repeat(41) })])).toMatchObject({ ok: false, fields: { "links.0.label": settingsCopy.errors.maxLength(40) } });
  });

  it("refuses an empty or whitespace-only label or address", () => {
    expect(parse([link({ label: "" })])).toMatchObject({ ok: false, fields: { "links.0.label": settingsCopy.errors.required } });
    expect(parse([link({ label: "   " })])).toMatchObject({ ok: false, fields: { "links.0.label": settingsCopy.errors.required } });
    expect(parse([link({ url: "" })]).ok).toBe(false);
    expect(parse([link({ url: "   " })]).ok).toBe(false);
  });

  it("refuses unsafe and malformed addresses, each at its own row", () => {
    const result = parse([link(), link({ url: "javascript:alert(1)" }), link({ url: "data:text/html,x" }), link({ url: "/portal/x" }), link({ url: "www.example.org" }), link({ url: "https//broken" })]);
    expect(result).toMatchObject({
      ok: false,
      fields: {
        "links.1.url": settingsCopy.errors.url,
        "links.2.url": settingsCopy.errors.url,
        "links.3.url": settingsCopy.errors.url,
        "links.4.url": settingsCopy.errors.url,
        "links.5.url": settingsCopy.errors.url,
      },
    });
    expect(result.ok === false && Object.keys(result.fields)).not.toContain("links.0.url");
  });

  it("refuses an address with a username or password, with its own message", () => {
    expect(parse([link({ url: "https://user:pass@x.org" })])).toMatchObject({ ok: false, fields: { "links.0.url": settingsCopy.errors.urlCredentials } });
  });

  it("accepts a plain http address (the panel warns, it does not refuse)", () => {
    expect(parse([link({ label: "Student Login", url: "http://203.0.113.5/login" })]).ok).toBe(true);
  });

  it("an address of 2048 characters passes and 2049 fails", () => {
    const long = (n: number) => `https://example.org/${"a".repeat(n - "https://example.org/".length)}`;
    expect(parse([link({ url: long(2048) })]).ok).toBe(true);
    expect(parse([link({ url: long(2049) })]).ok).toBe(false);
  });

  it("markup in a label is kept as plain text, never interpreted", () => {
    expect(parse([link({ label: "<b>Portal</b>" })])).toMatchObject({ ok: true, data: { links: [{ label: "<b>Portal</b>" }] } });
  });
});
