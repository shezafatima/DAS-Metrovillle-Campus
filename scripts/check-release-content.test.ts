// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkReleaseContent } from "./check-release-content";

describe("checkReleaseContent (release gate)", () => {
  it("blocks a production build while the privacy notice is a placeholder", () => {
    const result = checkReleaseContent({ vercelEnv: "production", privacyPlaceholder: true, retentionMonths: "12" });
    expect(result.blocking).toBe(true);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toMatch(/privacy notice/);
  });

  it("blocks a production build when retention was never set, and names it", () => {
    const result = checkReleaseContent({ vercelEnv: "production", privacyPlaceholder: false, retentionMonths: undefined });
    expect(result.blocking).toBe(true);
    expect(result.problems[0]).toMatch(/CAREERS_RETENTION_MONTHS/);
    expect(checkReleaseContent({ vercelEnv: "production", privacyPlaceholder: false, retentionMonths: "  " }).blocking).toBe(true);
  });

  it("names both problems when both are open", () => {
    const result = checkReleaseContent({ vercelEnv: "production", privacyPlaceholder: true, retentionMonths: undefined });
    expect(result.problems).toHaveLength(2);
  });

  it("only warns on preview and local builds", () => {
    for (const vercelEnv of ["preview", "development", undefined]) {
      const result = checkReleaseContent({ vercelEnv, privacyPlaceholder: true, retentionMonths: undefined });
      expect(result.ok).toBe(false);
      expect(result.blocking).toBe(false);
    }
  });

  it("passes in production once both are resolved", () => {
    const result = checkReleaseContent({ vercelEnv: "production", privacyPlaceholder: false, retentionMonths: "24" });
    expect(result).toEqual({ ok: true, problems: [], blocking: false });
  });
});
