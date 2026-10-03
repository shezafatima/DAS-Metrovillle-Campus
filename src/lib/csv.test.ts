import { describe, expect, it } from "vitest";
import { csvField, toCsv } from "./csv";

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

describe("toCsv", () => {
  const headers = ["Name", "Email"];

  it("starts with the UTF-8 BOM and the exact header line", () => {
    const csv = toCsv(headers, []);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).split("\r\n")[0]).toBe('"Name","Email"');
  });

  it("returns only the BOM and header when there are no rows", () => {
    expect(toCsv(headers, [])).toBe('﻿"Name","Email"\r\n');
  });

  it("uses CRLF line endings throughout", () => {
    const csv = toCsv(headers, [["a", "b"], ["c", "d"]]);
    expect(csv.split("\r\n").length).toBe(4); // header + 2 rows + trailing empty
    expect(csv).not.toMatch(/[^\r]\n/);
  });

  it("neutralises formulas in every cell and keeps Urdu names", () => {
    const csv = toCsv(headers, [["=SUM(1)", "علی خان"]]);
    expect(csv).toContain("\"'=SUM(1)\",\"علی خان\"");
  });
});
