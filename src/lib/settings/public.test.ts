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

describe("getPublicSettings: portalLinks (014b)", () => {
  const link = (id: string, o: Record<string, unknown> = {}) => ({ id, deletedAt: null, label: `Link ${id}`, url: `https://${id}.example.org/`, ...o });

  it("a never-saved group has no links, so the footer column is hidden", async () => {
    findById.mockResolvedValue(null);
    const { getPublicSettings } = await load();
    expect(await getPublicSettings("portalLinks")).toEqual({ links: [] });
  });

  it("returns the live links in saved order, without deleted ones or any envelope", async () => {
    findById.mockResolvedValue({
      version: 2,
      updatedBy: "a@b.pk",
      data: { links: [link("a"), link("gone", { deletedAt: new Date() }), link("b")] },
    });
    const { getPublicSettings } = await load();
    const result = await getPublicSettings("portalLinks");
    expect(result.links.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(JSON.stringify(result)).not.toContain("deletedAt");
    expect(JSON.stringify(result)).not.toContain("updatedBy");
  });

  it("marks an http:// address as insecure and an https:// one as not", async () => {
    findById.mockResolvedValue({
      version: 1,
      updatedBy: "a@b.pk",
      data: { links: [link("a", { url: "https://secure.example.org/" }), link("b", { url: "http://203.0.113.5/login" }), link("c", { url: "HTTP://UPPER.example.org" })] },
    });
    const { getPublicSettings } = await load();
    expect((await getPublicSettings("portalLinks")).links.map((entry) => entry.insecure)).toEqual([false, true, true]);
  });

  it("leaves out a link that has lost its label or address", async () => {
    findById.mockResolvedValue({
      version: 1,
      updatedBy: "a@b.pk",
      data: { links: [link("a", { label: "  " }), link("b", { url: "" }), link("c")] },
    });
    const { getPublicSettings } = await load();
    expect((await getPublicSettings("portalLinks")).links.map((entry) => entry.id)).toEqual(["c"]);
  });
});

describe("getPublicSettings: classLevels (014b)", () => {
  const level = (id: string, o: Record<string, unknown> = {}) => ({ id, deletedAt: null, name: `Level ${id}`, ageRule: "3 to 4 years", ...o });

  it("a never-saved group has no rows and the 31 July reference date", async () => {
    findById.mockResolvedValue(null);
    const { getPublicSettings } = await load();
    expect(await getPublicSettings("classLevels")).toEqual({ ageReferenceDate: "07-31", ageHeader: "31 July", levels: [] });
  });

  it("returns the live rows in saved order and the header for the saved date", async () => {
    findById.mockResolvedValue({
      version: 2,
      updatedBy: "a@b.pk",
      data: { ageReferenceDate: "04-01", levels: [level("a"), level("gone", { deletedAt: new Date() }), level("b", { ageRule: "5 to 6 years" })] },
    });
    const { getPublicSettings } = await load();
    const result = await getPublicSettings("classLevels");
    expect(result.ageHeader).toBe("1 April");
    expect(result.levels).toEqual([
      { id: "a", name: "Level a", ageRule: "3 to 4 years" },
      { id: "b", name: "Level b", ageRule: "5 to 6 years" },
    ]);
    expect(JSON.stringify(result)).not.toContain("deletedAt");
  });

  it("falls back to 31 July when the stored date is not a real day-month", async () => {
    findById.mockResolvedValue({ version: 1, updatedBy: "a@b.pk", data: { ageReferenceDate: "04-31", levels: [level("a")] } });
    const { getPublicSettings } = await load();
    expect(await getPublicSettings("classLevels")).toMatchObject({ ageReferenceDate: "07-31", ageHeader: "31 July" });
  });

  it("leaves out a row that has lost its name", async () => {
    findById.mockResolvedValue({ version: 1, updatedBy: "a@b.pk", data: { ageReferenceDate: "07-31", levels: [level("a", { name: "  " }), level("b")] } });
    const { getPublicSettings } = await load();
    expect((await getPublicSettings("classLevels")).levels.map((entry) => entry.id)).toEqual(["b"]);
  });
});

describe("getPublicSettings: syllabi (014b)", () => {
  const group = (id: string, o: Record<string, unknown> = {}) => ({ id, heading: "", intro: "", topics: ["a topic"], ...o });
  const subject = (id: string, groups: Record<string, unknown>[], o: Record<string, unknown> = {}) => ({ id, name: `Subject ${id}`, groups, ...o });
  const level = (id: string, subjects: Record<string, unknown>[], o: Record<string, unknown> = {}) => ({ id, deletedAt: null, name: `Level ${id}`, subjects, ...o });
  const load2 = async (levels: unknown[]) => {
    findById.mockResolvedValue({ version: 1, updatedBy: "a@b.pk", data: { levels } });
    const { getPublicSettings } = await load();
    return getPublicSettings("syllabi");
  };

  it("a never-saved group has no levels, so the section is hidden", async () => {
    findById.mockResolvedValue(null);
    const { getPublicSettings } = await load();
    expect(await getPublicSettings("syllabi")).toEqual({ levels: [] });
  });

  it("returns the levels with subjects, groups, intro paragraphs and topics, in saved order, with a slug per level", async () => {
    const result = await load2([
      level("a", [subject("s1", [group("g1", { heading: "Reading", intro: "First.\n\nSecond.", topics: [" one ", "", "two"] })])], { name: "Play Group" }),
      level("b", [subject("s2", [group("g2")])], { name: "Class 1" }),
    ]);
    expect(result.levels.map((entry) => [entry.name, entry.slug])).toEqual([
      ["Play Group", "play-group"],
      ["Class 1", "class-1"],
    ]);
    expect(result.levels[0].subjects[0].groups[0]).toEqual({ id: "g1", heading: "Reading", paragraphs: ["First.", "Second."], topics: ["one", "two"] });
  });

  it("leaves out removed levels, a level with no subject, and a subject or group with nothing to show", async () => {
    const result = await load2([
      level("gone", [subject("s", [group("g")])], { deletedAt: new Date() }),
      level("empty", []),
      level("no-groups", [subject("s0", [])]),
      level("blank-group", [subject("s1", [group("g1", { intro: "  ", topics: [] })])]),
      level("kept", [subject("s2", [group("g2", { intro: "", topics: [] }), group("g3")]), subject("s3", [])]),
    ]);
    expect(result.levels.map((entry) => entry.id)).toEqual(["kept"]);
    expect(result.levels[0].subjects.map((entry) => entry.id)).toEqual(["s2"]);
    expect(result.levels[0].subjects[0].groups.map((entry) => entry.id)).toEqual(["g3"]);
  });

  it("numbers repeated level names in the slugs", async () => {
    const result = await load2([level("a", [subject("s", [group("g")])], { name: "Class 1" }), level("b", [subject("s2", [group("g2")])], { name: "class 1" })]);
    expect(result.levels.map((entry) => entry.slug)).toEqual(["class-1", "class-1-2"]);
  });

  it("carries no deletedAt marker, version or author", async () => {
    const result = await load2([level("a", [subject("s", [group("g")])])]);
    expect(JSON.stringify(result)).not.toMatch(/deletedAt|updatedBy|version/);
  });
});

describe("getPublicSettings: examination (014b)", () => {
  const block = (id: string, o: Record<string, unknown> = {}) => ({ id, deletedAt: null, heading: `Block ${id}`, body: "One.\n\nTwo.", ...o });

  it("a never-saved group has no blocks, so the section is hidden", async () => {
    findById.mockResolvedValue(null);
    const { getPublicSettings } = await load();
    expect(await getPublicSettings("examination")).toEqual({ blocks: [] });
  });

  it("returns the live blocks in order with the body split into paragraphs", async () => {
    findById.mockResolvedValue({
      version: 1,
      updatedBy: "a@b.pk",
      data: { blocks: [block("a"), block("gone", { deletedAt: new Date() }), block("b", { body: "Single\nline folded." })] },
    });
    const { getPublicSettings } = await load();
    const result = await getPublicSettings("examination");
    expect(result.blocks).toEqual([
      { id: "a", heading: "Block a", paragraphs: ["One.", "Two."] },
      { id: "b", heading: "Block b", paragraphs: ["Single line folded."] },
    ]);
    expect(JSON.stringify(result)).not.toContain("deletedAt");
  });

  it("leaves out a block that has lost its heading or its body", async () => {
    findById.mockResolvedValue({ version: 1, updatedBy: "a@b.pk", data: { blocks: [block("a", { heading: " " }), block("b", { body: "  " }), block("c")] } });
    const { getPublicSettings } = await load();
    expect((await getPublicSettings("examination")).blocks.map((entry) => entry.id)).toEqual(["c"]);
  });
});
