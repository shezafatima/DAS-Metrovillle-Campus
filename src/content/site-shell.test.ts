import { describe, expect, it } from "vitest";
import { contactInfo, footerContent, navigationItems, portalLinks } from "./site-shell";

describe("navigationItems", () => {
  it("renders in the exact fixed order", () => {
    expect(navigationItems.map((item) => item.label)).toEqual([
      "Home",
      "About",
      "Campuses",
      "Academics",
      "Admission",
      "Resources",
      "News",
      "Contact",
    ]);
  });

  it("keeps the main menu at eight items: Careers is in the top bar and footer, not here (PRD §4)", () => {
    expect(navigationItems).toHaveLength(8);
    expect(navigationItems.some((item) => item.label === "Careers")).toBe(false);
  });

  it("never contains a Franchise Offer entry", () => {
    const hasFranchiseOffer = navigationItems.some(
      (item) => item.label === "Franchise Offer"
    );
    expect(hasFranchiseOffer).toBe(false);
  });
});

describe("Careers entry points (012)", () => {
  it("is the first link in the top bar and points at /careers", () => {
    expect(portalLinks[0]).toEqual({ label: "Careers", href: "/careers" });
  });

  it("is in the footer bar and points at /careers", () => {
    expect(footerContent.links).toEqual([{ label: "Careers", href: "/careers" }]);
  });
});

describe("contactInfo", () => {
  it("has a non-empty phone number", () => {
    expect(contactInfo.phone.length).toBeGreaterThan(0);
  });

  it("has a non-empty email address", () => {
    expect(contactInfo.email.length).toBeGreaterThan(0);
  });

  it("has a mapUrl starting with https://", () => {
    expect(contactInfo.mapUrl.startsWith("https://")).toBe(true);
  });

  it("has non-empty office hours", () => {
    expect(contactInfo.officeHours.length).toBeGreaterThan(0);
  });
});
