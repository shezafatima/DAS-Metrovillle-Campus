// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cvDownloadName } from "./download-name";

const at = (iso: string) => new Date(iso);

describe("cvDownloadName", () => {
  it("builds cv-<name>-<date>.pdf from the applicant's name and applied date", () => {
    expect(cvDownloadName({ name: "Ayesha Khan", createdAt: at("2026-10-03T10:00:00Z") })).toBe(
      "cv-ayesha-khan-2026-10-03.pdf",
    );
  });

  it("uses the Pakistan date, not the UTC date", () => {
    // 20:30 UTC on the 3rd is 01:30 on the 4th in Pakistan (UTC+5).
    expect(cvDownloadName({ name: "Ayesha Khan", createdAt: at("2026-10-03T20:30:00Z") })).toBe(
      "cv-ayesha-khan-2026-10-04.pdf",
    );
  });

  it("falls back to \"applicant\" when the name has no Latin letters (Urdu only)", () => {
    expect(cvDownloadName({ name: "عائشہ خان", createdAt: at("2026-10-03T10:00:00Z") })).toBe(
      "cv-applicant-2026-10-03.pdf",
    );
  });

  it("keeps the Latin part of a mixed Urdu and English name", () => {
    expect(cvDownloadName({ name: "عائشہ Khan", createdAt: at("2026-10-03T10:00:00Z") })).toBe(
      "cv-khan-2026-10-03.pdf",
    );
  });

  it("folds accents to plain letters", () => {
    expect(cvDownloadName({ name: "José Ñandú", createdAt: at("2026-10-03T10:00:00Z") })).toBe(
      "cv-jose-nandu-2026-10-03.pdf",
    );
  });

  it("cuts a long name to 40 characters without leaving a trailing hyphen", () => {
    const name = "Muhammad Abdul Rahman Siddiqui Al Hashmi Qureshi Bin Abdullah";
    const result = cvDownloadName({ name, createdAt: at("2026-10-03T10:00:00Z") });
    const slug = result.replace(/^cv-/, "").replace(/-\d{4}-\d{2}-\d{2}\.pdf$/, "");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug).not.toMatch(/-$/);
    expect(result).toMatch(/^cv-muhammad-abdul-rahman-siddiqui-al-hashmi/);
  });

  it("never lets a quote, slash, backslash, dot or line break into the header", () => {
    const hostile = 'Ali "AK"/..\\evil\r\nX-Injected: yes; filename="x.exe"';
    const result = cvDownloadName({ name: hostile, createdAt: at("2026-10-03T10:00:00Z") });
    expect(result).toMatch(/^cv-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(result).not.toMatch(/["\\/\r\n;:]/);
    expect(result.match(/\./g)).toHaveLength(1); // only the .pdf extension
  });

  it("is independent of anything but the name and date", () => {
    const a = cvDownloadName({ name: "Same Name", createdAt: at("2026-10-03T10:00:00Z") });
    const b = cvDownloadName({ name: "Same Name", createdAt: at("2026-10-03T11:00:00Z") });
    expect(a).toBe(b);
  });
});
