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

  it("keeps the main menu at eight top-level items: Careers is a child of About, not a ninth item (PRD §4)", () => {
    expect(navigationItems).toHaveLength(8);
    expect(navigationItems.some((item) => item.label === "Careers")).toBe(false);
  });

  it("has no taglines under the labels", () => {
    expect(JSON.stringify(navigationItems)).not.toContain("tagline");
  });

  it("never contains a Franchise Offer entry", () => {
    const hasFranchiseOffer = navigationItems.some(
      (item) => item.label === "Franchise Offer"
    );
    expect(hasFranchiseOffer).toBe(false);
  });
});

describe("Careers entry points (012)", () => {
  it("is the last entry in the About dropdown and points at /careers", () => {
    const about = navigationItems.find((item) => item.label === "About");
    expect(about?.children?.at(-1)).toEqual({ label: "Careers", href: "/careers" });
  });

  it("is not among the portal links (those are footer utility links)", () => {
    expect(portalLinks.some((link) => link.href === "/careers")).toBe(false);
  });

  it("is in the footer's Quick Links and points at /careers", () => {
    expect(footerContent.quickLinks).toContainEqual({ label: "Careers", href: "/careers" });
  });

  it("the footer's Quick Links are the main pages (no Campuses) and Careers", () => {
    expect(footerContent.quickLinks.map((l) => l.label)).toEqual(["Home", "About", "Academics", "Admission", "Resources", "News", "Careers", "Contact"]);
  });

  it("the footer's copyright takes its year as an argument, never a fixed one", () => {
    expect(footerContent.copyright(2031)).toBe("© 2031 Dar-e-Arqam School, Metroville Campus. All rights reserved.");
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
