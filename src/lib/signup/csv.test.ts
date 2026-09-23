import { describe, expect, it } from "vitest";
import { csvField, signupsToCsv, CSV_HEADERS } from "./csv";
import type { SignupRow } from "@/lib/signup/admin-queries";

function row(overrides: Partial<SignupRow> = {}): SignupRow {
  return {
    id: "1",
    name: "Ali Khan",
    email: "ali@example.com",
    phone: "+923001234567",
    phoneDisplay: "03001234567",
    sources: ["home"],
    firstSignupAt: "2026-09-01T09:00:00.000Z",
    lastSignupAt: "2026-09-05T09:00:00.000Z",
    ...overrides,
  };
}

describe("csvField", () => {
  it("quotes plain values", () => {
    expect(csvField("Ali Khan")).toBe('"Ali Khan"');
  });

  it("doubles inner quotes and commas stay inside one cell", () => {
    expect(csvField('Ali "AK" Khan, Jr.')).toBe('"Ali ""AK"" Khan, Jr."');
  });

  it("prefixes a leading formula character with a single quote", () => {
    expect(csvField("=SUM(1)")).toBe("\"'=SUM(1)\"");
    expect(csvField("+92 300")).toBe("\"'+92 300\"");
    expect(csvField("-1")).toBe("\"'-1\"");
    expect(csvField("@mention")).toBe("\"'@mention\"");
  });

  it("does not prefix a phone-shaped value that has no leading formula character", () => {
    expect(csvField("03001234567")).toBe('"03001234567"');
  });

  it("passes Urdu text through unchanged (aside from quoting)", () => {
    expect(csvField("علی خان")).toBe('"علی خان"');
  });
});

describe("signupsToCsv", () => {
  it("starts with the UTF-8 BOM", () => {
    expect(signupsToCsv([])).toMatch(/^﻿/);
  });

  it("has the exact header line", () => {
    const csv = signupsToCsv([]);
    const headerLine = csv.slice(1).split("\r\n")[0];
    expect(headerLine).toBe(CSV_HEADERS.map((h) => `"${h}"`).join(","));
  });

  it("returns only the BOM and header when there are no rows", () => {
    const csv = signupsToCsv([]);
    expect(csv).toBe(`﻿${CSV_HEADERS.map((h) => `"${h}"`).join(",")}\r\n`);
  });

  it("joins multiple sources with a semicolon", () => {
    const csv = signupsToCsv([row({ sources: ["home", "resources"] })]);
    expect(csv).toContain('"Home; Resources"');
  });

  it("uses CRLF line endings throughout", () => {
    const csv = signupsToCsv([row(), row({ email: "second@example.com" })]);
    expect(csv.split("\r\n").length).toBeGreaterThanOrEqual(3); // header + 2 rows + trailing
    expect(csv).not.toMatch(/[^\r]\n/); // no bare \n without a preceding \r
  });

  it("includes an Urdu name unchanged", () => {
    const csv = signupsToCsv([row({ name: "علی خان" })]);
    expect(csv).toContain('"علی خان"');
  });
});
