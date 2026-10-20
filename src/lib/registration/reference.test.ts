import { describe, expect, it } from "vitest";
import { newReference } from "./reference";
import { REFERENCE_ALPHABET, REFERENCE_LENGTH } from "./rules";

describe("newReference", () => {
  it("is 8 characters long", () => {
    expect(newReference()).toHaveLength(REFERENCE_LENGTH);
  });

  it("uses only the alphabet, never 0, O, 1, I or L", () => {
    for (let i = 0; i < 500; i += 1) {
      for (const char of newReference()) {
        expect(REFERENCE_ALPHABET).toContain(char);
        expect("0O1IL").not.toContain(char);
      }
    }
  });

  it("is not sequential: 1,000 draws are almost all distinct", () => {
    const draws = Array.from({ length: 1000 }, () => newReference());
    expect(new Set(draws).size).toBeGreaterThanOrEqual(990);
  });
});
