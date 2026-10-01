import { describe, it, expect } from "vitest";
import { validateChangePassword } from "@/lib/validation/account";

const CURRENT = "current-password-1";
const NEW = "brand-new-password";

function input(overrides: Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", unknown>> = {}) {
  return { currentPassword: CURRENT, newPassword: NEW, confirmPassword: NEW, ...overrides };
}

describe("validateChangePassword", () => {
  it("accepts a valid change", () => {
    expect(validateChangePassword(input())).toBeNull();
  });

  it("returns invalid for a missing or non-string field", () => {
    expect(validateChangePassword({ newPassword: NEW, confirmPassword: NEW })).toBe("invalid");
    expect(validateChangePassword(input({ currentPassword: "" }))).toBe("invalid");
    expect(validateChangePassword(input({ newPassword: 123 }))).toBe("invalid");
    expect(validateChangePassword(null)).toBe("invalid");
  });

  it("returns too_short under 12 characters and accepts exactly 12", () => {
    expect(validateChangePassword(input({ newPassword: "a".repeat(11), confirmPassword: "a".repeat(11) }))).toBe(
      "too_short",
    );
    expect(validateChangePassword(input({ newPassword: "a".repeat(12), confirmPassword: "a".repeat(12) }))).toBeNull();
  });

  it("returns too_long over 128 characters and accepts exactly 128", () => {
    expect(validateChangePassword(input({ newPassword: "a".repeat(129), confirmPassword: "a".repeat(129) }))).toBe(
      "too_long",
    );
    expect(validateChangePassword(input({ newPassword: "a".repeat(128), confirmPassword: "a".repeat(128) }))).toBeNull();
  });

  it("returns mismatch when the confirmation differs", () => {
    expect(validateChangePassword(input({ confirmPassword: `${NEW}x` }))).toBe("mismatch");
  });

  it("returns same_as_current when the new password equals the current one", () => {
    expect(validateChangePassword(input({ newPassword: CURRENT, confirmPassword: CURRENT }))).toBe(
      "same_as_current",
    );
  });

  it("checks the confirmation before same-as-current", () => {
    expect(validateChangePassword(input({ newPassword: CURRENT, confirmPassword: "something-else-1" }))).toBe(
      "mismatch",
    );
  });

  it("does not trim: surrounding spaces count toward length and make a different password", () => {
    expect(validateChangePassword(input({ newPassword: " a".repeat(6), confirmPassword: " a".repeat(6) }))).toBeNull();
    expect(validateChangePassword(input({ newPassword: ` ${CURRENT}`, confirmPassword: ` ${CURRENT}` }))).toBeNull();
    expect(validateChangePassword(input({ confirmPassword: `${NEW} ` }))).toBe("mismatch");
  });

  it("treats a different letter case as a different password", () => {
    const upper = CURRENT.toUpperCase();
    expect(validateChangePassword(input({ newPassword: upper, confirmPassword: upper }))).toBeNull();
  });
});
