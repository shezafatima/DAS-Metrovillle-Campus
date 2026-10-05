// @vitest-environment node
import { describe, expect, it } from "vitest";
import { APPLICATION_CSV_HEADERS, applicationsToCsv } from "./csv";
import type { CareerApplicationRow } from "./admin-queries";

function row(overrides: Partial<CareerApplicationRow> = {}): CareerApplicationRow {
  return {
    id: "507f1f77bcf86cd799439011",
    name: "Ayesha Khan",
    email: "ayesha@example.com",
    phone: "+923001234567",
    phoneDisplay: "03001234567",
    qualification: "M.Ed",
    appliedAt: "2026-10-03T10:00:00.000Z",
    ...overrides,
  };
}

describe("applicationsToCsv", () => {
  it("has the columns Name, Email, Phone, Qualification, Applied", () => {
    expect(APPLICATION_CSV_HEADERS).toEqual(["Name", "Email", "Phone", "Qualification", "Applied"]);
    const csv = applicationsToCsv([]);
    expect(csv.slice(1).split("\r\n")[0]).toBe('"Name","Email","Phone","Qualification","Applied"');
  });

  it("starts with the UTF-8 BOM so Excel reads Urdu correctly", () => {
    expect(applicationsToCsv([row()]).charCodeAt(0)).toBe(0xfeff);
  });

  it("writes the phone in local form and the applied date in Pakistan time", () => {
    const csv = applicationsToCsv([row()]);
    expect(csv).toContain('"03001234567"');
    expect(csv).toContain('"03 Oct 2026, 15:00"'); // 10:00 UTC is 15:00 in Pakistan
  });

  it("keeps Urdu names and qualifications unchanged", () => {
    const csv = applicationsToCsv([row({ name: "عائشہ خان", qualification: "ایم اے اردو" })]);
    expect(csv).toContain('"عائشہ خان"');
    expect(csv).toContain('"ایم اے اردو"');
  });

  it("neutralises a name that would run as a spreadsheet formula", () => {
    const csv = applicationsToCsv([row({ name: "=HYPERLINK(\"http://evil\")", qualification: "+cmd" })]);
    expect(csv).toContain("\"'=HYPERLINK(\"\"http://evil\"\")\"");
    expect(csv).toContain("\"'+cmd\"");
  });

  it("uses CRLF line endings throughout", () => {
    const csv = applicationsToCsv([row(), row({ email: "second@example.com" })]);
    expect(csv.split("\r\n")).toHaveLength(4); // header + 2 rows + trailing empty
    expect(csv).not.toMatch(/[^\r]\n/);
  });

  it("has only the header row when there are no applications", () => {
    expect(applicationsToCsv([])).toBe('﻿"Name","Email","Phone","Qualification","Applied"\r\n');
  });

  it("carries no file data or storage key: the row type has no field for either", () => {
    const csv = applicationsToCsv([row()]);
    expect(csv).not.toMatch(/cv\/|\.pdf|blob|key/i);
    expect(csv).not.toContain("507f1f77bcf86cd799439011"); // not even the id
  });
});
