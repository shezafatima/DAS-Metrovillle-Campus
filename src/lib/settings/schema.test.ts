// @vitest-environment node
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { fieldErrors } from "@/lib/validation/field-errors";
import { settingsCopy } from "@/content/admin";
import { schemaFor } from "./schema";
import { defaultsFor, mergeWithDefaults } from "./defaults";
import type { GroupDefinition } from "./types";

/**
 * Tests the engine against a small TEST-ONLY definition covering every field
 * type (contracts/field-definitions.md), not the real groups.
 */
const def: GroupDefinition = {
  key: "contact",
  label: "Test",
  fields: [
    { type: "text", key: "name", label: "Name", maxLength: 10, required: true },
    { type: "text", key: "nick", label: "Nick", maxLength: 5 },
    { type: "text", key: "mail", label: "Mail", maxLength: 50, format: "email" },
    { type: "longText", key: "notes", label: "Notes", maxLength: 20 },
    { type: "number", key: "count", label: "Count", min: 0, max: 100, errorMessage: "whole 0-100", required: true, default: 1 },
    { type: "url", key: "site", label: "Site", maxLength: 100 },
    { type: "url", key: "link", label: "Link", maxLength: 100, allowPath: true },
    { type: "image", key: "pic", label: "Pic", folder: "settings/hero", kind: "hero-desktop" },
    { type: "video", key: "video", label: "Video" },
    { type: "boolean", key: "on", label: "On", default: true },
    { type: "group", key: "social", label: "Social", fields: [{ type: "url", key: "fb", label: "Facebook", maxLength: 100 }] },
    {
      type: "list",
      key: "items",
      label: "Items",
      itemLabel: "item",
      maxItems: 3,
      default: [],
      itemFields: [
        { type: "text", key: "title", label: "Title", maxLength: 8 },
        { type: "boolean", key: "visible", label: "Visible", default: true },
        { type: "text", key: "btnLabel", label: "Button", maxLength: 10 },
        { type: "url", key: "btnLink", label: "Link", maxLength: 100, allowPath: true },
        { type: "image", key: "img", label: "Img", folder: "settings/hero", kind: "hero-desktop" },
      ],
      rules: [
        { kind: "atLeastOneVisible", field: "visible", message: "need one visible" },
        { kind: "allOrNone", fields: ["btnLabel", "btnLink"], message: "pair" },
      ],
    },
  ],
};

const IMAGE = {
  url: "https://res.cloudinary.com/demo/image/upload/v1/settings/hero/a.jpg",
  publicId: "settings/hero/a",
  width: 100,
  height: 50,
};

function item(o: Record<string, unknown> = {}) {
  return { id: randomUUID(), title: "T", visible: true, btnLabel: "", btnLink: "", img: null, ...o };
}

function valid(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ayesha",
    nick: "",
    mail: "",
    notes: "",
    count: 5,
    site: "",
    link: "",
    pic: null,
    video: "",
    on: true,
    social: { fb: "" },
    items: [item({ title: "One" })],
    ...overrides,
  };
}

function check(input: unknown) {
  const result = schemaFor(def).safeParse(input);
  return result.success
    ? { ok: true as const, data: result.data as Record<string, unknown> }
    : { ok: false as const, fields: fieldErrors(result.error) };
}

describe("schemaFor: text and long text", () => {
  it("accepts a valid value and trims text", () => {
    const r = check(valid({ name: "  Ayesha  " }));
    expect(r.ok && r.data.name).toBe("Ayesha");
  });

  it("requires required text and allows empty optional text", () => {
    expect(check(valid({ name: "" }))).toMatchObject({ ok: false, fields: { name: settingsCopy.errors.required } });
    expect(check(valid({ nick: "" })).ok).toBe(true);
  });

  it("refuses text over maxLength", () => {
    expect(check(valid({ nick: "abcdef" }))).toMatchObject({ ok: false, fields: { nick: settingsCopy.errors.maxLength(5) } });
  });

  it("checks the email format when the field says so", () => {
    expect(check(valid({ mail: "not-an-email" }))).toMatchObject({ ok: false, fields: { mail: settingsCopy.errors.email } });
    expect(check(valid({ mail: "a@b.pk" })).ok).toBe(true);
    expect(check(valid({ mail: "" })).ok).toBe(true);
  });

  it("keeps line breaks in long text", () => {
    const r = check(valid({ notes: "a\nb" }));
    expect(r.ok && r.data.notes).toBe("a\nb");
  });
});

describe("schemaFor: number", () => {
  it.each([-1, 2.5, 101, "abc", "", null, "1e3", "-4", "2.5"])("refuses %j", (value) => {
    expect(check(valid({ count: value }))).toMatchObject({ ok: false, fields: { count: "whole 0-100" } });
  });

  it.each([0, 5, 100, "42", " 7 "])("accepts %j", (value) => {
    expect(check(valid({ count: value })).ok).toBe(true);
  });

  it("coerces a numeric string from a form input to a number", () => {
    const r = check(valid({ count: "42" }));
    expect(r.ok && r.data.count).toBe(42);
  });
});

describe("schemaFor: url", () => {
  it.each(["https://example.com/x", "http://example.com"])("accepts %s", (value) => {
    expect(check(valid({ site: value })).ok).toBe(true);
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "ftp://example.com", "example.com", "/path"])(
    "refuses %s where paths are not allowed",
    (value) => {
      expect(check(valid({ site: value }))).toMatchObject({ ok: false, fields: { site: settingsCopy.errors.url } });
    },
  );

  it("accepts a site path only where allowPath is set, but not //host", () => {
    expect(check(valid({ link: "/admission" })).ok).toBe(true);
    expect(check(valid({ link: "//evil.com" })).ok).toBe(false);
    expect(check(valid({ link: "javascript:alert(1)" }))).toMatchObject({
      ok: false,
      fields: { link: settingsCopy.errors.urlOrPath },
    });
  });

  it("refuses a url over maxLength", () => {
    expect(check(valid({ site: `https://e.com/${"a".repeat(100)}` })).ok).toBe(false);
  });
});

describe("schemaFor: video (YouTube address)", () => {
  it("accepts a YouTube address and an empty value", () => {
    expect(check(valid({ video: "https://youtu.be/dQw4w9WgXcQ" })).ok).toBe(true);
    expect(check(valid({ video: "" })).ok).toBe(true);
  });

  it("refuses anything else", () => {
    expect(check(valid({ video: "https://vimeo.com/1" }))).toMatchObject({
      ok: false,
      fields: { video: settingsCopy.errors.youtube },
    });
  });
});

describe("schemaFor: image", () => {
  it("accepts an image in the field's folder and null when optional", () => {
    expect(check(valid({ pic: IMAGE })).ok).toBe(true);
    expect(check(valid({ pic: null })).ok).toBe(true);
  });

  it("refuses an image from another folder", () => {
    expect(check(valid({ pic: { ...IMAGE, publicId: "settings/gallery/a" } })).ok).toBe(false);
    expect(check(valid({ pic: { ...IMAGE, publicId: "news/covers/a" } })).ok).toBe(false);
  });

  it("allows an empty publicId only for the bundled placeholder images", () => {
    const placeholder = { url: "/images/hero/placeholder-desktop.svg", publicId: "", width: 1920, height: 700 };
    expect(check(valid({ pic: placeholder })).ok).toBe(true);
    expect(check(valid({ pic: { ...placeholder, url: "https://evil.example/x.png" } })).ok).toBe(false);
  });

  it("refuses a malformed reference", () => {
    expect(check(valid({ pic: { url: "x" } })).ok).toBe(false);
    expect(check(valid({ pic: { ...IMAGE, width: 0 } })).ok).toBe(false);
  });
});

describe("schemaFor: nested group", () => {
  it("validates nested fields with dotted paths", () => {
    expect(check(valid({ social: { fb: "not a url" } }))).toMatchObject({
      ok: false,
      fields: { "social.fb": settingsCopy.errors.url },
    });
  });

  it("drops keys the definition does not know", () => {
    const r = check({ ...valid(), injected: "x", social: { fb: "", other: "y" } });
    expect(r.ok && "injected" in r.data).toBe(false);
    expect(r.ok && "other" in (r.data.social as object)).toBe(false);
  });
});

describe("schemaFor: list", () => {
  it("refuses more than maxItems", () => {
    expect(check(valid({ items: [item(), item(), item(), item()] })).ok).toBe(false);
  });

  it("requires every item id to be a UUID and unique", () => {
    expect(check(valid({ items: [item({ id: "abc" })] })).ok).toBe(false);
    const dup = randomUUID();
    expect(check(valid({ items: [item({ id: dup }), item({ id: dup })] })).ok).toBe(false);
  });

  it("uses dotted paths with the item index for item errors", () => {
    const r = check(valid({ items: [item(), item({ title: "far too long title" })] }));
    expect(r).toMatchObject({ ok: false, fields: { "items.1.title": settingsCopy.errors.maxLength(8) } });
  });

  it("enforces allOrNone on the named fields", () => {
    expect(check(valid({ items: [item({ btnLabel: "Go" })] }))).toMatchObject({ ok: false, fields: { "items.0.btnLabel": "pair" } });
    expect(check(valid({ items: [item({ btnLink: "/x" })] }))).toMatchObject({ ok: false, fields: { "items.0.btnLabel": "pair" } });
    expect(check(valid({ items: [item({ btnLabel: "Go", btnLink: "/x" })] })).ok).toBe(true);
  });

  it("requires at least one visible item, reported on the list path", () => {
    expect(check(valid({ items: [item({ visible: false })] }))).toMatchObject({ ok: false, fields: { items: "need one visible" } });
    expect(check(valid({ items: [item({ visible: false }), item({ visible: true })] })).ok).toBe(true);
    expect(check(valid({ items: [] }))).toMatchObject({ ok: false, fields: { items: "need one visible" } });
  });

  it("refuses an incoming item that claims to be deleted", () => {
    expect(check(valid({ items: [item({ deletedAt: new Date().toISOString() })] })).ok).toBe(false);
  });
});

describe("defaultsFor and mergeWithDefaults", () => {
  it("builds defaults from the fields", () => {
    expect(defaultsFor(def)).toMatchObject({ name: "", count: 1, on: true, pic: null, video: "", social: { fb: "" }, items: [] });
  });

  it("returns a fresh copy each time", () => {
    const a = defaultsFor(def) as { items: unknown[] };
    a.items.push(1);
    expect((defaultsFor(def) as { items: unknown[] }).items).toEqual([]);
  });

  it("fills missing keys from defaults without touching present ones", () => {
    expect(mergeWithDefaults(def, { name: "X", social: {} })).toMatchObject({ name: "X", count: 1, social: { fb: "" } });
  });

  it("SC-009: adding a field to a definition changes the value shape and validation, with no other change", () => {
    const extended: GroupDefinition = {
      ...def,
      fields: [...def.fields, { type: "text", key: "motto", label: "Motto", maxLength: 6, required: true, default: "hi" }],
    };
    expect(defaultsFor(extended)).toMatchObject({ motto: "hi" });
    expect(schemaFor(extended).safeParse(valid({ motto: "much too long" })).success).toBe(false);
    expect(schemaFor(extended).safeParse(valid({ motto: "ok" })).success).toBe(true);
  });
});
