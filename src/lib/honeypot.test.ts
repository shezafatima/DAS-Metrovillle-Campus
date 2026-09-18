import { describe, expect, it } from "vitest";
import { HONEYPOT_FIELD, isHoneypotTripped } from "./honeypot";

describe("isHoneypotTripped", () => {
  it("is false for FormData without the field", () => {
    const fd = new FormData();
    fd.set("email", "visitor@example.com");
    expect(isHoneypotTripped(fd)).toBe(false);
  });

  it("is false for FormData with an empty honeypot field", () => {
    const fd = new FormData();
    fd.set(HONEYPOT_FIELD, "");
    expect(isHoneypotTripped(fd)).toBe(false);
  });

  it("is false for FormData with a whitespace-only honeypot field", () => {
    const fd = new FormData();
    fd.set(HONEYPOT_FIELD, "   ");
    expect(isHoneypotTripped(fd)).toBe(false);
  });

  it("is true for FormData with a filled honeypot field", () => {
    const fd = new FormData();
    fd.set(HONEYPOT_FIELD, "http://spam.example");
    expect(isHoneypotTripped(fd)).toBe(true);
  });

  it("is false for a JSON object without the field", () => {
    expect(isHoneypotTripped({ email: "visitor@example.com" })).toBe(false);
  });

  it("is false for a JSON object with an empty honeypot field", () => {
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "" })).toBe(false);
  });

  it("is true for a JSON object with a filled honeypot field", () => {
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "http://spam.example" })).toBe(true);
  });

  it("is false for undefined/null input", () => {
    expect(isHoneypotTripped(undefined)).toBe(false);
    expect(isHoneypotTripped(null)).toBe(false);
  });
});
