// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GENERATED_PASSWORD_ALPHABET, GENERATED_PASSWORD_LENGTH, generatePassword } from "@/lib/generate-password";

describe("generatePassword", () => {
  it("is 20 characters by default, at least the 16 the spec requires (FR-021)", () => {
    expect(GENERATED_PASSWORD_LENGTH).toBeGreaterThanOrEqual(16);
    expect(generatePassword()).toHaveLength(GENERATED_PASSWORD_LENGTH);
  });

  it("uses only alphabet characters, and none of the look-alikes 0 O 1 l I L", () => {
    expect(GENERATED_PASSWORD_ALPHABET).not.toMatch(/[0O1lIL]/);
    expect(new Set(GENERATED_PASSWORD_ALPHABET).size).toBe(GENERATED_PASSWORD_ALPHABET.length);
    for (let i = 0; i < 200; i++) {
      for (const ch of generatePassword()) expect(GENERATED_PASSWORD_ALPHABET).toContain(ch);
    }
  });

  it("gives a different value every time (1,000 draws, no repeats)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generatePassword());
    expect(seen.size).toBe(1000);
  });

  it("draws every alphabet character eventually (no dead characters)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) for (const ch of generatePassword()) seen.add(ch);
    expect(seen.size).toBe(GENERATED_PASSWORD_ALPHABET.length);
  });
});
