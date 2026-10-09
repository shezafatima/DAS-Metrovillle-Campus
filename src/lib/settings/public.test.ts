// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contactInfo } from "@/content/site-shell";
import { DEFAULT_HERO_SLIDE_ID } from "./groups/hero";

const findById = vi.fn();
const logSecurityEvent = vi.fn();

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/db", () => ({ connectDb: async () => undefined }));
vi.mock("@/lib/log", () => ({ logSecurityEvent: (...args: unknown[]) => logSecurityEvent(...args) }));
vi.mock("@/models/settings", () => ({
  Settings: { findById: (...args: unknown[]) => ({ lean: () => findById(...args) }) },
}));

const HERO_IMG = { url: "https://res.cloudinary.com/demo/image/upload/v1/settings/hero/a.jpg", publicId: "settings/hero/a", width: 8, height: 6 };

function slide(id: string, o: Record<string, unknown> = {}) {
  return {
    id,
    deletedAt: null,
    desktop: HERO_IMG,
    mobile: null,
    alt: `alt ${id}`,
    heading: "",
    buttonLabel: "",
    buttonLink: "",
    visible: true,
    ...o,
  };
}

async function load() {
  vi.resetModules();
  return import("./public");
}

beforeEach(() => {
  findById.mockReset();
  logSecurityEvent.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getPublicSettings: what the site may see", () => {
  it("returns the starting values when a group has never been saved", async () => {
    findById.mockResolvedValue(null);
    const { getPublicSettings } = await load();
    const contact = await getPublicSettings("contact");
    expect(contact).toEqual({
      phone: contactInfo.phone,
      email: contactInfo.email,
      address: contactInfo.address,
      mapUrl: contactInfo.mapUrl,
      officeHours: contactInfo.officeHours,
      social: contactInfo.social,
    });
  });

  it("omits empty social links", async () => {
    findById.mockResolvedValue({
      data: { ...contactInfo, social: { facebook: "https://fb.example/x", instagram: "", youtube: "", tiktok: "" } },
      version: 3,
      updatedBy: "x@y.pk",
    });
    const { getPublicSettings } = await load();
    const contact = await getPublicSettings("contact");
    expect(contact.social).toEqual({ facebook: "https://fb.example/x" });
  });

  it("hero: live and visible slides only, in order, with no admin fields", async () => {
    findById.mockResolvedValue({
      version: 4,
      updatedBy: "secret@school.pk",
      data: {
        displaySeconds: 7,
        slides: [
          slide("a", { heading: "Hello", buttonLabel: "Apply", buttonLink: "/admission" }),
          slide("b", { visible: false }),
          slide("c", { deletedAt: new Date() }),
          slide("d", { mobile: { ...HERO_IMG, publicId: "settings/hero/m" } }),
        ],
      },
    });
    const { getPublicSettings } = await load();
    const hero = await getPublicSettings("hero");

    expect(hero.displaySeconds).toBe(7);
    expect(hero.slides.map((s) => s.id)).toEqual(["a", "d"]);
    expect(hero.slides[0]).toMatchObject({ heading: "Hello", button: { label: "Apply", href: "/admission" }, mobile: null });
    expect(hero.slides[1].button).toBeNull();
    expect(hero.slides[1].mobile).toMatchObject({ publicId: "settings/hero/m" });

    const text = JSON.stringify(hero);
    for (const forbidden of ["deletedAt", "version", "updatedBy", "secret@school.pk", "visible"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("hero: an unsaved group returns the placeholder slide", async () => {
    findById.mockResolvedValue(null);
    const { getPublicSettings } = await load();
    const hero = await getPublicSettings("hero");
    expect(hero.slides.map((s) => s.id)).toEqual([DEFAULT_HERO_SLIDE_ID]);
  });

  it("stats: the four numbers", async () => {
    findById.mockResolvedValue({ data: { students: 1, books: 2, teachers: 3, campuses: 4 }, version: 1, updatedBy: "x" });
    const { getPublicSettings } = await load();
    expect(await getPublicSettings("stats")).toEqual({ students: 1, books: 2, teachers: 3, campuses: 4 });
  });

  it("video: derives the embed id, and an empty address means no video", async () => {
    const { getPublicSettings } = await load();
    findById.mockResolvedValue({ data: { youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" }, version: 1, updatedBy: "x" });
    expect(await getPublicSettings("video")).toEqual({ youtubeUrl: "https://youtu.be/dQw4w9WgXcQ", youtubeId: "dQw4w9WgXcQ" });

    findById.mockResolvedValue({ data: { youtubeUrl: "" }, version: 2, updatedBy: "x" });
    expect(await getPublicSettings("video")).toEqual({ youtubeUrl: "", youtubeId: null });
  });

  it("fills a field added after the group was saved from its default", async () => {
    findById.mockResolvedValue({ data: { phone: "0300", social: {} }, version: 1, updatedBy: "x" });
    const { getPublicSettings } = await load();
    const contact = await getPublicSettings("contact");
    expect(contact.phone).toBe("0300");
    expect(contact.email).toBe(contactInfo.email);
  });
});

describe("getPublicSettings: never an error (FR-032)", () => {
  it("falls back to the starting values when the first read fails, and logs without values", async () => {
    findById.mockRejectedValue(new Error("db down"));
    const { getPublicSettings } = await load();
    const stats = await getPublicSettings("stats");
    expect(stats).toEqual({ students: 300000, books: 50, teachers: 14500, campuses: 700 });
    expect(logSecurityEvent).toHaveBeenCalledWith({ type: "settings_read_failed", group: "stats" });
  });

  it("falls back to the last value read when a later read fails", async () => {
    const { getPublicSettings } = await load();
    findById.mockResolvedValueOnce({ data: { students: 9, books: 9, teachers: 9, campuses: 9 }, version: 1, updatedBy: "x" });
    expect((await getPublicSettings("stats")).students).toBe(9);

    findById.mockRejectedValueOnce(new Error("db down"));
    expect((await getPublicSettings("stats")).students).toBe(9);
  });

  it("does not remember a failure: once the database recovers, real values return", async () => {
    const { getPublicSettings } = await load();
    findById.mockRejectedValueOnce(new Error("db down"));
    expect((await getPublicSettings("stats")).students).toBe(300000);

    findById.mockResolvedValueOnce({ data: { students: 5, books: 5, teachers: 5, campuses: 5 }, version: 1, updatedBy: "x" });
    expect((await getPublicSettings("stats")).students).toBe(5);
  });

  it("gives up after 3 seconds and uses the fallback", async () => {
    vi.useFakeTimers();
    findById.mockReturnValue(new Promise(() => undefined));
    const { getPublicSettings } = await load();
    const pending = getPublicSettings("video");
    await vi.advanceTimersByTimeAsync(3000);
    expect(await pending).toEqual({ youtubeUrl: "", youtubeId: null });
    expect(logSecurityEvent).toHaveBeenCalledWith({ type: "settings_read_failed", group: "video" });
  });

  it("never throws, whatever the failure", async () => {
    findById.mockImplementation(() => {
      throw new TypeError("boom");
    });
    const { getPublicSettings } = await load();
    await expect(getPublicSettings("video")).resolves.toEqual({ youtubeUrl: "", youtubeId: null });
  });
});
