import { describe, expect, it } from "vitest";
import { contactInfo, footerContent, legacyAboutRedirects, legacyAcademicsRedirects, navigationItems, pageSections, portalLinks } from "./site-shell";

describe("About sections (017)", () => {
  it("are the five anchored sections, in order", () => {
    expect(pageSections.about).toEqual([
      { id: "our-story", label: "Our Story" },
      { id: "vision-mission", label: "Vision & Mission" },
      { id: "core-values", label: "Core Values" },
      { id: "management-team", label: "Our Management Team" },
      { id: "messages", label: "Messages" },
    ]);
  });

  it("redirects the four old sub-routes to a new section", () => {
    expect(legacyAboutRedirects).toEqual([
      { source: "/about/overview", destination: "/about#our-story" },
      { source: "/about/salient-features", destination: "/about" },
      { source: "/about/management", destination: "/about#management-team" },
      { source: "/about/messages", destination: "/about#messages" },
    ]);
  });
});

describe("Academics sections (018)", () => {
  it("are the three anchored sections, in order", () => {
    expect(pageSections.academics).toEqual([
      { id: "academic-overview", label: "Academic Overview" },
      { id: "teachers-training", label: "Teachers' Training" },
      { id: "hifz-e-quran", label: "Hifz-e-Quran" },
    ]);
  });

  it("drives the Academics dropdown, with no Syllabi or Examination entry", () => {
    const academics = navigationItems.find((i) => i.label === "Academics")!;
    expect(academics.children!.map((c) => c.href)).toEqual([
      "/academics#academic-overview",
      "/academics#teachers-training",
      "/academics#hifz-e-quran",
    ]);
    expect(academics.children!.some((c) => /syllabi|examination/i.test(c.label))).toBe(false);
  });

  it("redirects the four old sub-routes", () => {
    expect(legacyAcademicsRedirects).toEqual([
      { source: "/academics/academics-overview", destination: "/academics#academic-overview" },
      { source: "/academics/syllabi", destination: "/academics" },
      { source: "/academics/examinations", destination: "/academics" },
      { source: "/academics/teachers-training", destination: "/academics#teachers-training" },
    ]);
  });
});

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

  it("pageSections.resources is Photo Gallery and School App, and no nav link uses a removed anchor", () => {
    expect(pageSections.resources).toEqual([
      { id: "photo-gallery", label: "Photo Gallery" },
      { id: "mobile-apps", label: "School App" },
    ]);
    const hrefs = navigationItems.flatMap((i) => [i.href, ...(i.children ?? []).map((c) => c.href)]);
    for (const href of hrefs) expect(href).not.toMatch(/#(downloads|our-books)/);
  });

  it("Resources shows Photo Gallery and School App (the old Mobile Apps label is gone; the anchor is unchanged)", () => {
    const resources = navigationItems.find((i) => i.label === "Resources");
    expect(resources?.children).toEqual([
      { label: "Photo Gallery", href: "/resources#photo-gallery" },
      { label: "School App", href: "/resources#mobile-apps" },
    ]);
    expect(JSON.stringify(navigationItems)).not.toContain("Mobile Apps");
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
