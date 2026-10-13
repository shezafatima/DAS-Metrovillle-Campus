import { describe, expect, it } from "vitest";
import { linkMatchesType, mobileAppsSchema } from "./schema";

const DRIVE = "https://drive.google.com/file/d/15V_ogaFhGTmkaMHTggAcIFiLDDHevpxy/view?usp=sharing";
const PLAY = "https://play.google.com/store/apps/details?id=com.darearqam.daslms";

describe("linkMatchesType", () => {
  it("play-store accepts a details URL, with or without extra params", () => {
    expect(linkMatchesType(PLAY, "play-store")).toBe(true);
    expect(linkMatchesType(`${PLAY}&hl=en`, "play-store")).toBe(true);
  });
  it("play-store refuses http, search pages, look-alike hosts and a missing id", () => {
    expect(linkMatchesType("http://play.google.com/store/apps/details?id=x", "play-store")).toBe(false);
    expect(linkMatchesType("https://play.google.com/store/search?q=x", "play-store")).toBe(false);
    expect(linkMatchesType("https://play.google.com.evil.example/store/apps/details?id=x", "play-store")).toBe(false);
    expect(linkMatchesType("https://play.google.com/store/apps/details", "play-store")).toBe(false);
    expect(linkMatchesType("https://play.google.com/store/apps/details?id=", "play-store")).toBe(false);
  });
  it("app-store accepts apps.apple.com over https only", () => {
    expect(linkMatchesType("https://apps.apple.com/pk/app/x/id123", "app-store")).toBe(true);
    expect(linkMatchesType("http://apps.apple.com/pk/app/x/id123", "app-store")).toBe(false);
    expect(linkMatchesType("https://itunes.apple.com.evil.example/pk/app/x/id123", "app-store")).toBe(false);
  });
  it("direct-download accepts any https URL and nothing else", () => {
    expect(linkMatchesType(DRIVE, "direct-download")).toBe(true);
    expect(linkMatchesType("http://drive.google.com/file/d/x", "direct-download")).toBe(false);
    expect(linkMatchesType("javascript:alert(1)", "direct-download")).toBe(false);
    expect(linkMatchesType("/files/app.apk", "direct-download")).toBe(false);
    expect(linkMatchesType("not a url", "direct-download")).toBe(false);
  });
});

const app = (over: Record<string, unknown> = {}) => ({
  id: "scarlet-english",
  name: "Scarlet English",
  icon: "book-a",
  url: DRIVE,
  linkType: "direct-download",
  ...over,
});
const value = (over: Record<string, unknown> = {}) => ({
  heading: "Scarlet Series Mobile Applications",
  body: "One paragraph.",
  image: { url: "/images/resources/scarlet-series-playgroup.jpeg", publicId: "", width: 744, height: 1280 },
  imageAlt: "A flyer",
  apps: [app(), app({ id: "lms-app", name: "LMS App", icon: "monitor-smartphone", url: "", linkType: "play-store" })],
  ...over,
});

describe("mobileAppsSchema", () => {
  it("accepts the data-model values", () => {
    expect(mobileAppsSchema.safeParse(value()).success).toBe(true);
  });
  it("accepts an empty url for any linkType", () => {
    for (const linkType of ["play-store", "app-store", "direct-download"]) {
      expect(mobileAppsSchema.safeParse(value({ apps: [app({ url: "", linkType })] })).success).toBe(true);
    }
  });
  it("rejects a http direct-download URL and a mismatched store URL", () => {
    expect(mobileAppsSchema.safeParse(value({ apps: [app({ url: "http://example.com/a.apk" })] })).success).toBe(false);
    expect(
      mobileAppsSchema.safeParse(value({ apps: [app({ url: "https://apps.apple.com/pk/app/x/id1", linkType: "play-store" })] })).success,
    ).toBe(false);
  });
  it("rejects 0 and 9 apps and duplicate ids", () => {
    expect(mobileAppsSchema.safeParse(value({ apps: [] })).success).toBe(false);
    const nine = Array.from({ length: 9 }, (_, i) => app({ id: `app-${i}` }));
    expect(mobileAppsSchema.safeParse(value({ apps: nine })).success).toBe(false);
    expect(mobileAppsSchema.safeParse(value({ apps: [app(), app()] })).success).toBe(false);
  });
  it("rejects an unknown icon, a non-kebab id and over-long text", () => {
    expect(mobileAppsSchema.safeParse(value({ apps: [app({ icon: "rocket" })] })).success).toBe(false);
    expect(mobileAppsSchema.safeParse(value({ apps: [app({ id: "Scarlet_English" })] })).success).toBe(false);
    expect(mobileAppsSchema.safeParse(value({ apps: [app({ name: "x".repeat(61) })] })).success).toBe(false);
    expect(mobileAppsSchema.safeParse(value({ heading: "" })).success).toBe(false);
    expect(mobileAppsSchema.safeParse(value({ body: "x".repeat(2001) })).success).toBe(false);
  });
  it("requires imageAlt with an image, but not without one", () => {
    expect(mobileAppsSchema.safeParse(value({ imageAlt: "" })).success).toBe(false);
    expect(mobileAppsSchema.safeParse(value({ image: null, imageAlt: "" })).success).toBe(true);
  });
});
