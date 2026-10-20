import { describe, expect, it } from "vitest";
import { ageOn } from "./age";

describe("ageOn", () => {
  it("counts a birthday that is today", () => {
    expect(ageOn("2025-03-10", "2027-03-10")).toBe(2);
  });

  it("does not count a birthday that is tomorrow", () => {
    expect(ageOn("2025-03-11", "2027-03-10")).toBe(1);
  });

  it("is 18 one day before the 19th birthday and 19 on it", () => {
    expect(ageOn("2008-03-11", "2027-03-10")).toBe(18);
    expect(ageOn("2008-03-10", "2027-03-10")).toBe(19);
  });

  it("reaches a 29 February birthday on 1 March in a non-leap year", () => {
    expect(ageOn("2020-02-29", "2027-02-28")).toBe(6);
    expect(ageOn("2020-02-29", "2027-03-01")).toBe(7);
  });

  it("reaches a 29 February birthday on 29 February in a leap year", () => {
    expect(ageOn("2020-02-29", "2028-02-28")).toBe(7);
    expect(ageOn("2020-02-29", "2028-02-29")).toBe(8);
  });
});
