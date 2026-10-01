// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contactInfo } from "@/content/site-shell";
import { defaultsFor } from "./defaults";
import { schemaFor } from "./schema";
import { GROUPS, GROUP_KEYS, getDefinition, isGroupKey } from "./registry";
import { contactDefinition } from "./groups/contact";
import { heroDefinition } from "./groups/hero";
import { statsDefinition } from "./groups/stats";
import { liveItems } from "./items";

describe("starting values", () => {
  it("SC-001: contact defaults deep-equal the 001/008 content-file values", () => {
    expect(defaultsFor(contactDefinition)).toEqual({
      phone: contactInfo.phone,
      email: contactInfo.email,
      address: contactInfo.address,
      officeHours: contactInfo.officeHours,
      mapUrl: contactInfo.mapUrl,
      social: {
        facebook: contactInfo.social.facebook,
        instagram: contactInfo.social.instagram,
        youtube: contactInfo.social.youtube,
        tiktok: contactInfo.social.tiktok,
      },
    });
  });

  it.each(GROUP_KEYS)("%s: the defaults pass the group's own schema", (key) => {
    const def = GROUPS[key];
    const result = schemaFor(def).safeParse(defaultsFor(def));
    expect(result.success).toBe(true);
  });

  it("hero starts with exactly one visible slide (clarification 1)", () => {
    const defaults = defaultsFor(heroDefinition) as { displaySeconds: number; slides: { visible: boolean; alt: string }[] };
    expect(defaults.displaySeconds).toBe(5);
    expect(liveItems(defaults.slides)).toHaveLength(1);
    expect(defaults.slides[0].visible).toBe(true);
    expect(defaults.slides[0].alt).not.toBe("");
  });

  it("stats start with the reference dashboard numbers", () => {
    expect(defaultsFor(statsDefinition)).toEqual({ students: 300000, books: 50, teachers: 14500, campuses: 700 });
  });

  it("the video starts empty", () => {
    expect(defaultsFor(GROUPS.video)).toEqual({ youtubeUrl: "" });
  });
});

describe("registry", () => {
  it("knows exactly the four groups and refuses anything else (the gallery left the engine in 007)", () => {
    expect(GROUP_KEYS).toEqual(["contact", "hero", "stats", "video"]);
    expect(isGroupKey("gallery")).toBe(false);
    expect(isGroupKey("hero")).toBe(true);
    expect(isGroupKey("users")).toBe(false);
    expect(getDefinition("nope")).toBeNull();
    expect(getDefinition(undefined)).toBeNull();
    expect(getDefinition("stats")).toBe(statsDefinition);
  });

  it("each definition's key matches its registry key", () => {
    for (const key of GROUP_KEYS) expect(GROUPS[key].key).toBe(key);
  });
});

describe("hero rules on the real definition", () => {
  const slide = (o: Record<string, unknown> = {}) => ({
    id: crypto.randomUUID(),
    desktop: { url: "/images/hero/placeholder-desktop.svg", publicId: "", width: 1920, height: 700 },
    mobile: null,
    alt: "A slide",
    heading: "",
    buttonLabel: "",
    buttonLink: "",
    visible: true,
    ...o,
  });
  const check = (data: unknown) => schemaFor(heroDefinition).safeParse(data);

  it("refuses zero visible slides, including one hidden plus one already gone", () => {
    expect(check({ displaySeconds: 5, slides: [slide({ visible: false })] }).success).toBe(false);
    expect(check({ displaySeconds: 5, slides: [] }).success).toBe(false);
  });
});
