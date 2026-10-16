import { describe, expect, it } from "vitest";
import { duplicateKey } from "./duplicate-key";

const base = { studentName: "Ayesha Khan", dateOfBirth: "2020-05-01", fatherMobile: "+923001234567" };

describe("duplicateKey", () => {
  it("ignores case and extra spaces in the name", () => {
    expect(duplicateKey({ ...base, studentName: "  ayesha   KHAN " })).toBe(duplicateKey(base));
  });

  it("treats composed and decomposed Urdu as the same name", () => {
    const composed = "آمنہ";
    const decomposed = "آمنہ";
    expect(composed).not.toBe(decomposed);
    expect(duplicateKey({ ...base, studentName: composed })).toBe(duplicateKey({ ...base, studentName: decomposed }));
  });

  it("is null without a father's mobile", () => {
    expect(duplicateKey({ ...base, fatherMobile: null })).toBeNull();
  });

  it("differs for a different date of birth or father's mobile", () => {
    expect(duplicateKey({ ...base, dateOfBirth: "2020-05-02" })).not.toBe(duplicateKey(base));
    expect(duplicateKey({ ...base, fatherMobile: "+923001234568" })).not.toBe(duplicateKey(base));
  });
});
