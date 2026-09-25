import { describe, expect, it } from "vitest";
import { getContactDetails, mapEmbedSrc } from "@/lib/contact-details";
import { contactInfo } from "@/content/site-shell";

describe("getContactDetails", () => {
  it("resolves to the content object", async () => {
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
