import { describe, expect, it } from "vitest";
import { formatPhoneLocal, normalisePakistaniMobile, phoneSearchDigits } from "./phone";

describe("normalisePakistaniMobile", () => {
  it.each([
    ["03001234567", "+923001234567"],
    ["0300-1234567", "+923001234567"],
    ["+92 300 1234567", "+923001234567"],
    ["92 300 1234567", "+923001234567"],
    ["0300 123 4567", "+923001234567"],
    ["(0300) 1234567", "+923001234567"],
  ])("accepts %s → %s", (input, expected) => {
    expect(normalisePakistaniMobile(input)).toBe(expected);
  });

  it.each([
    ["021-12345678", "landline"],
    ["0300123456", "only 10 digits"],
    ["+44 7700 900123", "non-Pakistani number"],
    ["not a phone", "letters"],
    ["", "empty"],
    ["030012345678", "twelve digits"],
  ])("rejects %s (%s)", (input) => {
    expect(normalisePakistaniMobile(input)).toBeNull();
  });
});

describe("formatPhoneLocal", () => {
  it("renders the E.164 form as the local 03… form", () => {
    expect(formatPhoneLocal("+923001234567")).toBe("03001234567");
  });
});

describe("phoneSearchDigits", () => {
  it.each([
    ["0300 123", "92300123"],
    ["+92300", "92300"],
    ["300123", "300123"],
    ["0300-1234567", "923001234567"],
  ])("%s → %s", (query, expected) => {
    expect(phoneSearchDigits(query)).toBe(expected);
  });

  it("returns null for fewer than 3 digits", () => {
    expect(phoneSearchDigits("12")).toBeNull();
    expect(phoneSearchDigits("")).toBeNull();
    expect(phoneSearchDigits("ali")).toBeNull();
  });
});
