import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

const NOW = new Date("2026-09-26T12:00:00.000Z");

function secondsAgo(s: number): Date {
  return new Date(NOW.getTime() - s * 1000);
}

describe("formatRelativeTime", () => {
  it("just now under a minute", () => {
    expect(formatRelativeTime(secondsAgo(0), NOW)).toBe("just now");
    expect(formatRelativeTime(secondsAgo(59), NOW)).toBe("just now");
  });

  it("minutes from 60 seconds up to just under an hour", () => {
    expect(formatRelativeTime(secondsAgo(60), NOW)).toBe("1 minute ago");
    expect(formatRelativeTime(secondsAgo(120), NOW)).toBe("2 minutes ago");
    expect(formatRelativeTime(secondsAgo(59 * 60), NOW)).toBe("59 minutes ago");
  });

  it("hours from 60 minutes up to just under a day", () => {
    expect(formatRelativeTime(secondsAgo(60 * 60), NOW)).toBe("1 hour ago");
    expect(formatRelativeTime(secondsAgo(2 * 60 * 60), NOW)).toBe("2 hours ago");
    expect(formatRelativeTime(secondsAgo(23 * 60 * 60), NOW)).toBe("23 hours ago");
  });

  it("days from 24 hours up to just under 7 days", () => {
    expect(formatRelativeTime(secondsAgo(24 * 60 * 60), NOW)).toBe("1 day ago");
    expect(formatRelativeTime(secondsAgo((6 * 24 + 23) * 60 * 60), NOW)).toBe("6 days ago");
  });

  it("falls back to the absolute admin date-time at 7 days and beyond", () => {
    const sevenDaysAgo = secondsAgo(7 * 24 * 60 * 60);
    const result = formatRelativeTime(sevenDaysAgo, NOW);
    expect(result).not.toContain("ago");
    expect(result).toMatch(/^\d{1,2} \w{3} \d{4}, \d{2}:\d{2}$/);
  });
});
