// @vitest-environment node
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { settingsCopy } from "@/content/admin";
import { fieldErrors } from "@/lib/validation/field-errors";
import { schemaFor } from "./schema";
import { heroDefinition } from "./groups/hero";

const IMG = { url: "/images/hero/placeholder-desktop.svg", publicId: "", width: 1920, height: 700 };

function slide(o: Record<string, unknown> = {}) {
  return { id: randomUUID(), desktop: IMG, mobile: null, alt: "A slide", heading: "", buttonLabel: "", buttonLink: "", visible: true, ...o };
}

function check(data: unknown) {
  const r = schemaFor(heroDefinition).safeParse(data);
  return r.success ? { ok: true as const } : { ok: false as const, fields: fieldErrors(r.error) };
}

const hero = (slides: unknown[], displaySeconds: unknown = 5) => ({ displaySeconds, slides });

describe("hero slides schema (FR-012–FR-016)", () => {
  it("accepts a slide with only the required fields", () => {
    expect(check(hero([slide()])).ok).toBe(true);
  });

  it("requires a desktop image and alt text", () => {
    expect(check(hero([slide({ desktop: null })]))).toMatchObject({ ok: false, fields: { "slides.0.desktop": settingsCopy.errors.imageRequired } });
    expect(check(hero([slide({ alt: "" })]))).toMatchObject({ ok: false, fields: { "slides.0.alt": settingsCopy.errors.required } });
  });

  it("the mobile image is optional", () => {
    expect(check(hero([slide({ mobile: null })])).ok).toBe(true);
    expect(check(hero([slide({ mobile: { ...IMG, url: "/images/hero/placeholder-mobile.svg" } })])).ok).toBe(true);
  });

  it("a button needs both a label and a link, or neither", () => {
    expect(check(hero([slide({ buttonLabel: "Apply" })]))).toMatchObject({ ok: false, fields: { "slides.0.buttonLabel": settingsCopy.errors.buttonPair } });
    expect(check(hero([slide({ buttonLink: "/admission" })]))).toMatchObject({ ok: false, fields: { "slides.0.buttonLabel": settingsCopy.errors.buttonPair } });
    expect(check(hero([slide({ buttonLabel: "Apply", buttonLink: "/admission" })])).ok).toBe(true);
  });

  it("a button link is a site path or a web address, never javascript:", () => {
    expect(check(hero([slide({ buttonLabel: "Go", buttonLink: "https://example.pk/apply" })])).ok).toBe(true);
    expect(check(hero([slide({ buttonLabel: "Go", buttonLink: "javascript:alert(1)" })]))).toMatchObject({
      ok: false,
      fields: { "slides.0.buttonLink": settingsCopy.errors.urlOrPath },
    });
  });

  it("limits heading (80), alt (150) and button label (30)", () => {
    expect(check(hero([slide({ heading: "h".repeat(80) })])).ok).toBe(true);
    expect(check(hero([slide({ heading: "h".repeat(81) })])).ok).toBe(false);
    expect(check(hero([slide({ alt: "a".repeat(151) })])).ok).toBe(false);
    expect(check(hero([slide({ buttonLabel: "b".repeat(31), buttonLink: "/x" })])).ok).toBe(false);
  });

  it.each([2, 16, 4.5, "abc", "", null])("refuses a display time of %j", (seconds) => {
    expect(check(hero([slide()], seconds))).toMatchObject({ ok: false, fields: { displaySeconds: settingsCopy.errors.displaySeconds } });
  });

  it.each([3, 15, "8"])("accepts a display time of %j", (seconds) => {
    expect(check(hero([slide()], seconds)).ok).toBe(true);
  });

  it("allows 10 slides and refuses 11", () => {
    expect(check(hero(Array.from({ length: 10 }, () => slide()))).ok).toBe(true);
    expect(check(hero(Array.from({ length: 11 }, () => slide())))).toMatchObject({ ok: false, fields: { slides: settingsCopy.errors.tooMany(10) } });
  });

  it("refuses zero visible slides, however they got there (SC-006)", () => {
    const message = settingsCopy.errors.lastVisibleSlide;
    expect(check(hero([slide({ visible: false })]))).toMatchObject({ ok: false, fields: { slides: message } });
    expect(check(hero([slide({ visible: false }), slide({ visible: false })]))).toMatchObject({ ok: false, fields: { slides: message } });
    expect(check(hero([]))).toMatchObject({ ok: false, fields: { slides: message } });
    expect(check(hero([slide({ visible: false }), slide({ visible: true })])).ok).toBe(true);
  });

  it("an item image must be in the hero folder, or a bundled placeholder", () => {
    const cloud = { url: "https://res.cloudinary.com/x/image/upload/v1/settings/hero/a.jpg", publicId: "settings/hero/a", width: 10, height: 10 };
    expect(check(hero([slide({ desktop: cloud })])).ok).toBe(true);
    expect(check(hero([slide({ desktop: { ...cloud, publicId: "settings/gallery/a" } })])).ok).toBe(false);
    expect(check(hero([slide({ desktop: { ...IMG, url: "https://evil.example/a.png" } })])).ok).toBe(false);
  });
});
