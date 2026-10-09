import { describe, expect, it } from "vitest";
import { contactInfo, footerContent, navigationItems, portalLinks } from "./site-shell";

describe("navigationItems", () => {
  it("renders in the exact fixed order", () => {
    expect(navigationItems.map((item) => item.label)).toEqual([
      "Home",
      "About",
      "Careers",
      "Academics",
      "Admission",
      "Resources",
      "News",
      "Contact",
    ]);
  });

  it("keeps the main menu at eight top-level items: Careers replaced Campuses", () => {
    expect(navigationItems).toHaveLength(8);
    expect(navigationItems.some((item) => item.label === "Campuses")).toBe(false);
    expect(navigationItems.find((item) => item.label === "Careers")).toEqual({ label: "Careers", href: "/careers" });
  });

  it("points every dropdown of a single page at an anchor on that page, with short hyphenated ids", () => {
    for (const label of ["About", "Academics", "Admission", "Resources"]) {
      const item = navigationItems.find((i) => i.label === label)!;
      for (const child of item.children!) {
        expect(child.href).toMatch(new RegExp(`^${item.href}#[a-z]+(-[a-z]+)*$`));
      }
    }
  });

  it("Resources shows only Photo Gallery and Mobile Apps", () => {
    const resources = navigationItems.find((i) => i.label === "Resources");
    expect(resources?.children).toEqual([
      { label: "Photo Gallery", href: "/resources#photo-gallery" },
      { label: "Mobile Apps", href: "/resources#mobile-apps" },
    ]);
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
  it("is no longer in the About dropdown", () => {
    const about = navigationItems.find((item) => item.label === "About");
    expect(about?.children?.some((child) => child.label === "Careers")).toBe(false);
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
