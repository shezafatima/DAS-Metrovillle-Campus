import { describe, expect, it } from "vitest";
import { contactInfo, navigationItems } from "./site-shell";

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

  it("never contains a Franchise Offer entry", () => {
    const hasFranchiseOffer = navigationItems.some(
      (item) => item.label === "Franchise Offer"
    );
    expect(hasFranchiseOffer).toBe(false);
  });
});

describe("contactInfo", () => {
  it("has a non-empty phone number", () => {
    expect(contactInfo.phone.length).toBeGreaterThan(0);
  });

  it("has a non-empty email address", () => {
    expect(contactInfo.email.length).toBeGreaterThan(0);
  });
});
