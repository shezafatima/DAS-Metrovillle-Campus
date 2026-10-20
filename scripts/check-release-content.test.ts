// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkReleaseContent } from "./check-release-content";

// The 013 registration items, resolved: the 012 cases below are about careers and the stock photos.
const REG_OK = { registrationPrivacyPlaceholder: false, registrationRetentionMonths: "12" };

describe("checkReleaseContent (release gate)", () => {
  it("blocks a production build while the privacy notice is a placeholder", () => {
    const result = checkReleaseContent({ ...REG_OK, vercelEnv: "production", privacyPlaceholder: true, retentionMonths: "12" });
    expect(result.blocking).toBe(true);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toMatch(/privacy notice/);
  });

  it("blocks a production build when retention was never set, and names it", () => {
    const result = checkReleaseContent({ ...REG_OK, vercelEnv: "production", privacyPlaceholder: false, retentionMonths: undefined });
    expect(result.blocking).toBe(true);
    expect(result.problems[0]).toMatch(/CAREERS_RETENTION_MONTHS/);
    expect(checkReleaseContent({ ...REG_OK, vercelEnv: "production", privacyPlaceholder: false, retentionMonths: "  " }).blocking).toBe(true);
  });

  it("names both problems when both are open", () => {
    const result = checkReleaseContent({ ...REG_OK, vercelEnv: "production", privacyPlaceholder: true, retentionMonths: undefined });
    expect(result.problems).toHaveLength(2);
  });

  it("only warns on preview and local builds", () => {
    for (const vercelEnv of ["preview", "development", undefined]) {
      const result = checkReleaseContent({ ...REG_OK, vercelEnv, privacyPlaceholder: true, retentionMonths: undefined });
      expect(result.ok).toBe(false);
      expect(result.blocking).toBe(false);
    }
  });

  it("passes in production once both are resolved", () => {
    const result = checkReleaseContent({ ...REG_OK, vercelEnv: "production", privacyPlaceholder: false, retentionMonths: "24" });
    expect(result).toEqual({ ok: true, problems: [], blocking: false });
  });

  it("blocks a production build while a stock-photo host is still allowed, and names it", () => {
    const result = checkReleaseContent({ ...REG_OK,
      vercelEnv: "production",
      privacyPlaceholder: false,
      retentionMonths: "24",
      temporaryImageHosts: ["picsum.photos"],
    });
    expect(result.blocking).toBe(true);
    expect(result.problems[0]).toMatch(/picsum.photos/);
  });

  it("passes with an empty host list, and the real list is what next.config.ts allows", async () => {
    const { TEMPORARY_IMAGE_HOSTS } = await import("../src/lib/temporary-image-hosts");
    expect(checkReleaseContent({ ...REG_OK, vercelEnv: "production", privacyPlaceholder: false, retentionMonths: "24", temporaryImageHosts: [] }).ok).toBe(true);
    expect(TEMPORARY_IMAGE_HOSTS).toContain("picsum.photos");
  });

  it("blocks a production build while the registration privacy notice is pending, and names it", () => {
    const result = checkReleaseContent({ vercelEnv: "production", privacyPlaceholder: false, retentionMonths: "12", registrationPrivacyPlaceholder: true, registrationRetentionMonths: "12" });
    expect(result.blocking).toBe(true);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toMatch(/registrationCopy\.privacy\.placeholder/);
  });

  it("blocks a production build when REGISTRATION_RETENTION_MONTHS is not set, and names it", () => {
    for (const registrationRetentionMonths of [undefined, "  "]) {
      const result = checkReleaseContent({ vercelEnv: "production", privacyPlaceholder: false, retentionMonths: "12", registrationPrivacyPlaceholder: false, registrationRetentionMonths });
      expect(result.blocking).toBe(true);
      expect(result.problems).toHaveLength(1);
      expect(result.problems[0]).toMatch(/REGISTRATION_RETENTION_MONTHS/);
    }
  });

  it("only warns about the registration items on preview builds", () => {
    const result = checkReleaseContent({ vercelEnv: "preview", privacyPlaceholder: false, retentionMonths: "12", registrationPrivacyPlaceholder: true, registrationRetentionMonths: undefined });
    expect(result.ok).toBe(false);
    expect(result.blocking).toBe(false);
    expect(result.problems).toHaveLength(2);
  });

  it("passes once the registration items are resolved too", () => {
    expect(checkReleaseContent({ vercelEnv: "production", privacyPlaceholder: false, retentionMonths: "12", registrationPrivacyPlaceholder: false, registrationRetentionMonths: "12" }).ok).toBe(true);
  });
});
