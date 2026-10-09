import { describe, expect, it } from "vitest";
import { formatCount } from "./format-count";

describe("formatCount", () => {
  it("returns the plain number at or below 99", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(42)).toBe("42");
    expect(formatCount(99)).toBe("99");
  });

  it("returns 99+ above 99", () => {
    expect(formatCount(100)).toBe("99+");
    expect(formatCount(1000)).toBe("99+");
  });
});
