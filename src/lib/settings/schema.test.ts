// @vitest-environment node
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { fieldErrors } from "@/lib/validation/field-errors";
import { settingsCopy } from "@/content/admin";
import { parseGroup, schemaFor } from "./schema";
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

// 020: the date field and the group-level dateOrder rule, on their own TEST-ONLY definition.
const datesDef: GroupDefinition = {
  key: "admission",
  label: "Dates",
  fields: [
    { type: "date", key: "from", label: "From" },
    { type: "date", key: "to", label: "To" },
    { type: "date", key: "must", label: "Must", required: true },
  ],
  rules: [{ kind: "dateOrder", from: "from", to: "to", message: "to before from" }],
};

function checkDates(input: Record<string, unknown>) {
  const result = schemaFor(datesDef).safeParse({ from: "", to: "", must: "2027-01-01", ...input });
  return result.success
    ? { ok: true as const, data: result.data as Record<string, unknown> }
    : { ok: false as const, fields: fieldErrors(result.error) };
}

describe("schemaFor: date (020)", () => {
  it("accepts an empty value and a real calendar date, trimmed", () => {
    expect(checkDates({ from: "" }).ok).toBe(true);
    const r = checkDates({ from: " 2027-03-31 " });
    expect(r.ok && r.data.from).toBe("2027-03-31");
    expect(checkDates({ from: "2028-02-29" }).ok).toBe(true); // leap day
  });

  it("refuses impossible and wrongly written dates", () => {
    for (const bad of ["2027-02-30", "2027-02-29", "31/03/2027", "2027-3-1", "2027-13-01", "tomorrow"]) {
      expect(checkDates({ from: bad })).toMatchObject({ ok: false, fields: { from: settingsCopy.errors.date } });
    }
  });

  it("requires a required date", () => {
    expect(checkDates({ must: "" })).toMatchObject({ ok: false, fields: { must: settingsCopy.errors.required } });
  });

  it("reads a missing date as empty", () => {
    const result = schemaFor(datesDef).safeParse({ must: "2027-01-01" });
    expect(result.success && result.data.from).toBe("");
  });
});

describe("schemaFor: group rule dateOrder (020)", () => {
  it("refuses an end before the start, with the message on the end field", () => {
    expect(checkDates({ from: "2027-03-31", to: "2027-01-01" })).toEqual({ ok: false, fields: { to: "to before from" } });
  });

  it("accepts the same day and a later end", () => {
    expect(checkDates({ from: "2027-01-15", to: "2027-01-15" }).ok).toBe(true);
    expect(checkDates({ from: "2027-01-01", to: "2027-03-31" }).ok).toBe(true);
  });

  it("does not apply while either date is empty", () => {
    expect(checkDates({ from: "2027-03-31", to: "" }).ok).toBe(true);
    expect(checkDates({ from: "", to: "2027-01-01" }).ok).toBe(true);
  });

  it("leaves a definition without rules unaffected", () => {
    expect(check(valid()).ok).toBe(true);
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

describe("schemaFor: list rule uniqueText (013)", () => {
  const classesDef: GroupDefinition = {
    key: "admission",
    label: "Classes",
    fields: [
      {
        type: "list",
        key: "classes",
        label: "Classes",
        itemLabel: "class",
        maxItems: 30,
        default: [],
        itemFields: [{ type: "text", key: "name", label: "Name", required: true, maxLength: 50 }],
        rules: [{ kind: "uniqueText", field: "name", message: "dup" }],
      },
    ],
  };
  const row = (name: string) => ({ id: randomUUID(), name });

  it("refuses a later duplicate ignoring case and extra spaces, on that entry's field", () => {
    expect(parseGroup(classesDef, { classes: [row("Class 1"), row(" class  1 ")] })).toEqual({
      ok: false,
      fields: { "classes.1.name": "dup" },
    });
  });

  it("accepts distinct names", () => {
    expect(parseGroup(classesDef, { classes: [row("Playgroup"), row("Nursery"), row("Class 1")] }).ok).toBe(true);
  });

  it("leaves empty names to the required rule", () => {
    expect(parseGroup(classesDef, { classes: [row(""), row("  ")] })).toEqual({
      ok: false,
      fields: { "classes.0.name": settingsCopy.errors.required, "classes.1.name": settingsCopy.errors.required },
    });
  });
});

// ── 014b: URL options for the footer's portal links ──────────────────────

describe("schemaFor: url options (014b)", () => {
  const portalDef: GroupDefinition = {
    key: "portalLinks",
    label: "Portal",
    fields: [
      { type: "url", key: "strict", label: "Strict", maxLength: 100, required: true, rejectCredentials: true, warnInsecure: true, testLink: true },
      { type: "url", key: "plain", label: "Plain", maxLength: 100 },
    ],
  };
  const parse = (input: unknown) => {
    const result = schemaFor(portalDef).safeParse(input);
    return result.success ? { ok: true as const, data: result.data as Record<string, unknown> } : { ok: false as const, fields: fieldErrors(result.error) };
  };

  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "/portal/x",
    "www.example.org",
    "https//broken",
    "ftp://x.org",
    "https://",
  ])("refuses %s", (value) => {
    expect(parse({ strict: value, plain: "" })).toMatchObject({ ok: false, fields: { strict: settingsCopy.errors.url } });
  });

  it.each(["https://u:p@x.org", "https://u@x.org", "http://user:secret@203.0.113.5/login"])("refuses an address with credentials: %s", (value) => {
    expect(parse({ strict: value, plain: "" })).toMatchObject({ ok: false, fields: { strict: settingsCopy.errors.urlCredentials } });
  });

  it("accepts an uppercase scheme and stores it in lower case", () => {
    expect(parse({ strict: "HTTPS://Example.org/A", plain: "" })).toMatchObject({ ok: true, data: { strict: "https://Example.org/A" } });
    expect(parse({ strict: "HTTP://203.0.113.5/login", plain: "" })).toMatchObject({ ok: true, data: { strict: "http://203.0.113.5/login" } });
  });

  it("accepts a plain http address (it only warns in the editor)", () => {
    expect(parse({ strict: "http://203.0.113.5/login", plain: "" }).ok).toBe(true);
  });

  it("trims leading and trailing spaces", () => {
    expect(parse({ strict: "  https://lms.example.org/  ", plain: "" })).toMatchObject({ ok: true, data: { strict: "https://lms.example.org/" } });
  });

  it("refuses an address with a space inside", () => {
    expect(parse({ strict: "https://exa mple.org", plain: "" }).ok).toBe(false);
  });

  it("a required url that is empty or only spaces is refused", () => {
    expect(parse({ strict: "", plain: "" }).ok).toBe(false);
    expect(parse({ strict: "   ", plain: "" }).ok).toBe(false);
  });

  it("without the options a url keeps its old behaviour: credentials accepted, scheme not rewritten", () => {
    expect(parse({ strict: "https://ok.org", plain: "https://u:p@x.org" })).toMatchObject({ ok: true, data: { plain: "https://u:p@x.org" } });
    expect(parse({ strict: "https://ok.org", plain: "HTTPS://X.org" })).toMatchObject({ ok: true, data: { plain: "HTTPS://X.org" } });
  });
});

// ── 014b: day-month field ────────────────────────────────────────────────

describe("schemaFor: dayMonth (014b)", () => {
  const dmDef: GroupDefinition = {
    key: "classLevels",
    label: "Test",
    fields: [
      { type: "dayMonth", key: "ref", label: "Reference", required: true, default: "07-31" },
      { type: "dayMonth", key: "optional", label: "Optional" },
    ],
  };
  const parse = (input: unknown) => {
    const result = schemaFor(dmDef).safeParse(input);
    return result.success ? { ok: true as const, data: result.data as Record<string, unknown> } : { ok: false as const, fields: fieldErrors(result.error) };
  };

  it.each(["07-31", "02-29", "12-01", "04-30"])("accepts %s", (value) => {
    expect(parse({ ref: value, optional: "" })).toMatchObject({ ok: true, data: { ref: value } });
  });

  it.each(["04-31", "02-30", "13-01", "00-10", "7-31", "2026-07-31", "31 July", "abc"])("refuses %s", (value) => {
    expect(parse({ ref: value, optional: "" })).toMatchObject({ ok: false, fields: { ref: settingsCopy.errors.dayMonth } });
  });

  it("a required value that is empty or only spaces is refused; an optional one may be empty", () => {
    expect(parse({ ref: "", optional: "" }).ok).toBe(false);
    expect(parse({ ref: "   ", optional: "" }).ok).toBe(false);
    expect(parse({ ref: "07-31", optional: "" }).ok).toBe(true);
    expect(parse({ ref: "07-31", optional: "13-40" })).toMatchObject({ ok: false, fields: { optional: settingsCopy.errors.dayMonth } });
  });

  it("starts from its default", () => {
    expect(defaultsFor(dmDef)).toEqual({ ref: "07-31", optional: "" });
  });
});

describe("schemaFor: uniqueText with a message that names the repeated text (014b)", () => {
  const namedDef: GroupDefinition = {
    key: "classLevels",
    label: "Test",
    fields: [
      {
        type: "list",
        key: "levels",
        label: "Levels",
        itemLabel: "level",
        maxItems: 5,
        rules: [{ kind: "uniqueText", field: "name", message: (name: string) => `Another level is already called '${name}'.` }],
        itemFields: [{ type: "text", key: "name", label: "Name", required: true, maxLength: 60 }],
      },
    ],
  };
  const parse = (names: string[]) => {
    const result = schemaFor(namedDef).safeParse({ levels: names.map((name) => ({ id: randomUUID(), name })) });
    return result.success ? { ok: true as const } : { ok: false as const, fields: fieldErrors(result.error) };
  };

  it("names the text as it was typed on the repeated row", () => {
    expect(parse(["Class 1", " class  1 "])).toEqual({ ok: false, fields: { "levels.1.name": "Another level is already called 'class 1'." } });
  });

  it("accepts distinct names", () => {
    expect(parse(["Class 1", "Class 2"]).ok).toBe(true);
  });
});

// ── 014b: lines field, anyOf item rule, maxTotalLines group rule ─────────

describe("schemaFor: lines (014b)", () => {
  const linesDef: GroupDefinition = {
    key: "syllabi",
    label: "Test",
    fields: [{ type: "lines", key: "topics", label: "Topics", maxItems: 3, maxLength: 10, default: [] }],
  };
  const parse = (input: unknown) => {
    const result = schemaFor(linesDef).safeParse(input);
    return result.success ? { ok: true as const, data: result.data as { topics: string[] } } : { ok: false as const, fields: fieldErrors(result.error) };
  };

  it("splits a string on line breaks, trims every line and drops blank ones", () => {
    expect(parse({ topics: " a \n\n  b\r\n\t\nc " })).toEqual({ ok: true, data: { topics: ["a", "b", "c"] } });
  });

  it("takes an array as it is, trimmed and without blank entries", () => {
    expect(parse({ topics: [" a ", "", "b"] })).toEqual({ ok: true, data: { topics: ["a", "b"] } });
  });

  it("reads nothing, an empty string and only blanks as no lines", () => {
    expect(parse({})).toEqual({ ok: true, data: { topics: [] } });
    expect(parse({ topics: null })).toEqual({ ok: true, data: { topics: [] } });
    expect(parse({ topics: "  \n \n" })).toEqual({ ok: true, data: { topics: [] } });
  });

  it("refuses more lines than the limit, counting only non-blank lines", () => {
    expect(parse({ topics: "a\n\nb\nc" }).ok).toBe(true);
    expect(parse({ topics: "a\nb\nc\nd" })).toEqual({ ok: false, fields: { topics: settingsCopy.errors.tooManyLines(3) } });
  });

  it("refuses a line over the length limit, naming its line number among the kept lines", () => {
    expect(parse({ topics: "a".repeat(10) }).ok).toBe(true);
    expect(parse({ topics: `ok\n\n${"b".repeat(11)}` })).toEqual({ ok: false, fields: { topics: settingsCopy.errors.lineTooLong(2, 10) } });
  });

  it("refuses something that is not text", () => {
    expect(parse({ topics: [1, 2] }).ok).toBe(false);
    expect(parse({ topics: 5 }).ok).toBe(false);
  });

  it("starts from its default (an empty list)", () => {
    expect(defaultsFor(linesDef)).toEqual({ topics: [] });
  });
});

describe("schemaFor: the anyOf item rule (014b)", () => {
  const groupDef: GroupDefinition = {
    key: "syllabi",
    label: "Test",
    fields: [
      {
        type: "list",
        key: "groups",
        label: "Groups",
        itemLabel: "group",
        maxItems: 5,
        rules: [{ kind: "anyOf", fields: ["intro", "topics"], message: "Add an intro or a topic." }],
        itemFields: [
          { type: "longText", key: "intro", label: "Intro", maxLength: 100 },
          { type: "lines", key: "topics", label: "Topics", maxItems: 5, maxLength: 20 },
        ],
      },
    ],
  };
  const parse = (groups: Record<string, unknown>[]) => {
    const result = schemaFor(groupDef).safeParse({ groups: groups.map((group) => ({ id: randomUUID(), ...group })) });
    return result.success ? { ok: true as const } : { ok: false as const, fields: fieldErrors(result.error) };
  };

  it("refuses an item with neither an intro nor a topic, on the first field", () => {
    expect(parse([{ intro: "", topics: [] }])).toEqual({ ok: false, fields: { "groups.0.intro": "Add an intro or a topic." } });
    expect(parse([{ intro: "   ", topics: "  \n " }])).toMatchObject({ ok: false, fields: { "groups.0.intro": "Add an intro or a topic." } });
  });

  it("accepts an intro alone, topics alone, or both", () => {
    expect(parse([{ intro: "Only an intro", topics: [] }]).ok).toBe(true);
    expect(parse([{ intro: "", topics: ["one"] }]).ok).toBe(true);
    expect(parse([{ intro: "Both", topics: ["one"] }]).ok).toBe(true);
  });

  it("names the failing row", () => {
    expect(parse([{ intro: "ok" }, { intro: "", topics: [] }])).toEqual({ ok: false, fields: { "groups.1.intro": "Add an intro or a topic." } });
  });
});

describe("schemaFor: the maxTotalLines group rule (014b)", () => {
  const nestedDef: GroupDefinition = {
    key: "syllabi",
    label: "Test",
    fields: [
      {
        type: "list",
        key: "levels",
        label: "Levels",
        itemLabel: "level",
        maxItems: 10,
        itemFields: [
          { type: "text", key: "name", label: "Name", maxLength: 20 },
          {
            type: "list",
            key: "subjects",
            label: "Subjects",
            itemLabel: "subject",
            maxItems: 10,
            itemFields: [
              {
                type: "list",
                key: "groups",
                label: "Groups",
                itemLabel: "group",
                maxItems: 10,
                itemFields: [{ type: "lines", key: "topics", label: "Topics", maxItems: 100, maxLength: 20 }],
              },
            ],
          },
        ],
      },
    ],
    rules: [{ kind: "maxTotalLines", path: "levels.subjects.groups.topics", max: 5, message: "Too many topics in all." }],
  };
  const topics = (n: number) => Array.from({ length: n }, (_, i) => `t${i}`);
  const level = (...groupSizes: number[]) => ({
    id: randomUUID(),
    name: "L",
    subjects: groupSizes.map((size) => ({ id: randomUUID(), groups: [{ id: randomUUID(), topics: topics(size) }] })),
  });
  const parse = (levels: unknown[]) => {
    const result = schemaFor(nestedDef).safeParse({ levels });
    return result.success ? { ok: true as const } : { ok: false as const, fields: fieldErrors(result.error) };
  };

  it("counts the lines through every level, subject and group", () => {
    expect(parse([level(2, 1), level(2)]).ok).toBe(true);
    expect(parse([level(2, 1), level(2, 1)])).toEqual({ ok: false, fields: { levels: "Too many topics in all." } });
  });

  it("allows exactly the maximum and refuses one more", () => {
    expect(parse([level(5)]).ok).toBe(true);
    expect(parse([level(6)]).ok).toBe(false);
  });

  it("an empty list of levels is within the limit", () => {
    expect(parse([]).ok).toBe(true);
  });

  it("validates nested items too: a nested id must be a uuid, and a bad nested item is reported at its path", () => {
    const bad = { id: randomUUID(), name: "L", subjects: [{ id: "not-a-uuid", groups: [] }] };
    expect(parse([bad])).toMatchObject({ ok: false, fields: { "levels.0.subjects.0.id": settingsCopy.errors.unknownItem } });
  });
});
