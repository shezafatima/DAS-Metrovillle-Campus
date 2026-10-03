// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAREERS_REAPPLY_WINDOW_DAYS, reapplyFrom, windowStart } from "./rules";

// PKT is UTC+5: 2026-10-01 23:59 PKT = 2026-10-01T18:59Z, and 00:00 PKT = 19:00Z the evening before.
const pkt = (iso: string) => new Date(`${iso}+05:00`);

describe("reapplyFrom", () => {
  it("is 30 calendar days after the Pakistan date of the application", () => {
    expect(reapplyFrom(pkt("2026-10-01T23:59:00"))).toBe("2026-10-31");
    expect(reapplyFrom(pkt("2026-10-01T00:00:00"))).toBe("2026-10-31");
  });

  it("uses the Pakistan date, not the UTC date", () => {
    // 2026-10-01 01:00 PKT is still 2026-09-30 in UTC.
    expect(reapplyFrom(pkt("2026-10-01T01:00:00"))).toBe("2026-10-31");
    // 2026-10-01 23:30 PKT is 18:30Z the same UTC day.
    expect(reapplyFrom(pkt("2026-10-01T23:30:00"))).toBe("2026-10-31");
  });

  it("crosses month and year ends", () => {
    expect(reapplyFrom(pkt("2026-12-15T12:00:00"))).toBe("2027-01-14");
    expect(reapplyFrom(pkt("2028-02-10T12:00:00"))).toBe("2028-03-11"); // leap year
  });
});

describe("windowStart", () => {
  it("is 00:00 Pakistan time 29 days before today", () => {
    expect(windowStart(pkt("2026-10-30T15:00:00")).toISOString()).toBe(pkt("2026-10-01T00:00:00").toISOString());
  });

  it("blocks through day D + 29 and frees the person on day D + 30", () => {
    const applied = pkt("2026-10-01T23:59:00");
    // D + 29: still blocked (the application is inside the window).
    expect(applied >= windowStart(pkt("2026-10-30T00:00:00"))).toBe(true);
    expect(applied >= windowStart(pkt("2026-10-30T23:59:59"))).toBe(true);
    // D + 30 from 00:00 PKT: free.
    expect(applied >= windowStart(pkt("2026-10-31T00:00:00"))).toBe(false);
  });

  it("agrees with reapplyFrom at the boundary for any time of day", () => {
    for (const time of ["00:00:00", "05:30:00", "12:00:00", "23:59:59"]) {
      const applied = pkt(`2026-03-10T${time}`);
      const [y, m, d] = reapplyFrom(applied).split("-").map(Number);
      const firstFreeInstant = pkt(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00`);
      expect(applied >= windowStart(firstFreeInstant)).toBe(false);
      expect(applied >= windowStart(new Date(firstFreeInstant.getTime() - 1))).toBe(true);
    }
  });
});

describe("the window length is written in one place", () => {
  const WINDOW_LITERAL = /\b30\b/;

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(full);
    }
    return out;
  }

  it("is 30 days", () => {
    expect(CAREERS_REAPPLY_WINDOW_DAYS).toBe(30);
  });

  it("does not appear as a literal 30 in careers code outside rules.ts", () => {
    const src = path.resolve(__dirname, "../..");
    const files = [
      ...walk(path.join(src, "lib/careers")),
      ...walk(path.join(src, "app/api/public/careers")),
      ...walk(path.join(src, "components/careers")),
    ].filter((f) => path.basename(f) !== "rules.ts");
    const offenders = files
      .filter((file) => {
        // Strip comments: a comment may mention "30 days" or "30 s".
        const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
        return /reapply|window/i.test(code) && WINDOW_LITERAL.test(code);
      })
      .map((f) => path.relative(src, f));
    expect(offenders).toEqual([]);
  });
});
