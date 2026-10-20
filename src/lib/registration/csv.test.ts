// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { RegistrationDetail } from "./admin-queries";
import { REGISTRATION_CSV_HEADERS, registrationsToCsv } from "./csv";

const ROW: RegistrationDetail = {
  id: "a".repeat(24),
  reference: "K7MQ2XRT",
  status: "contacted",
  studentName: "زرتاشہ",
  dateOfBirth: "2020-05-01",
  className: "Class 1",
  fatherName: "Imran",
  motherName: "Sana",
  fatherMobile: "+923001234567",
  motherMobile: null,
  email: "parent@example.com",
  address: "House 12",
  emergencyName: "Uncle",
  emergencyPhone: "+923011234567",
  motherTongue: "other",
  motherTongueOther: "Hindko",
  vaccinated: false,
  medicalHistory: null,
  referenceStudent: null,
  remarks: "=cmd|' /C calc'!A0",
  submittedAt: "2027-01-05T09:05:00.000Z",
  consentAt: "2027-01-05T09:05:00.000Z",
  likelyDuplicate: true,
  history: [],
};

describe("registrationsToCsv", () => {
  it("starts with the BOM and the headers in the contract order", () => {
    const csv = registrationsToCsv([]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe(`﻿${REGISTRATION_CSV_HEADERS.map((h) => `"${h}"`).join(",")}\r\n`);
    expect(REGISTRATION_CSV_HEADERS[0]).toBe("Reference");
    expect(REGISTRATION_CSV_HEADERS[3]).toBe("Likely duplicate");
    expect(REGISTRATION_CSV_HEADERS.at(-1)).toBe("Consent given at");
  });

  it("writes Yes/No, local mobiles, Pakistan time, status labels and keeps Urdu", () => {
    const lines = registrationsToCsv([ROW]).split("\r\n");
    const row = lines[1];
    expect(row).toContain('"K7MQ2XRT","2027-01-05 14:05","Contacted","Yes","زرتاشہ"');
    expect(row).toContain('"03001234567","Sana","","parent@example.com"');
    expect(row).toContain('"Other: Hindko","No",""');
  });

  it("neutralises a formula and writes null fields as empty", () => {
    const row = registrationsToCsv([ROW]).split("\r\n")[1];
    expect(row).toContain(`"'=cmd|' /C calc'!A0"`);
    expect(row).toContain('"","","","');
  });
});
