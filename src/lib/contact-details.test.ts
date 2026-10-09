import { beforeEach, describe, expect, it, vi } from "vitest";
import { contactInfo } from "@/content/site-shell";

const getPublicSettings = vi.fn();
vi.mock("@/lib/settings/public", () => ({
  getPublicSettings: (...args: unknown[]) => getPublicSettings(...args),
}));

import { getContactDetails, mapEmbedSrc } from "@/lib/contact-details";

beforeEach(() => {
  getPublicSettings.mockReset();
});

describe("getContactDetails", () => {
  it("reads the contact group from Settings and returns it unchanged", async () => {
    const saved = { ...contactInfo, phone: "+92-300-1111111", social: { facebook: "https://fb.example/x" } };
    getPublicSettings.mockResolvedValue(saved);
    await expect(getContactDetails()).resolves.toEqual(saved);
    expect(getPublicSettings).toHaveBeenCalledWith("contact");
  });

  it("returns the content-file values when Settings supplies them (nothing saved yet)", async () => {
    getPublicSettings.mockResolvedValue(contactInfo);
    await expect(getContactDetails()).resolves.toEqual(contactInfo);
  });
});

describe("mapEmbedSrc", () => {
  it("encodes the address and includes output=embed", () => {
    const src = mapEmbedSrc("313 West Canal, Lahore");
    expect(src).toContain(encodeURIComponent("313 West Canal, Lahore"));
    expect(src).toContain("output=embed");
  });

  it("encodes special characters like & and #", () => {
    const src = mapEmbedSrc("A & B #4");
    expect(src).toContain(encodeURIComponent("A & B #4"));
    expect(src).not.toContain("A & B #4");
  });
});
