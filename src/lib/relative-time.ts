import { formatAdminDateTime } from "@/lib/admin-datetime";

/**
 * "How long ago" for the notification panel (009) — the first relative
 * formatter in this codebase; every other admin table shows an
 * absolute PKT date-time (research.md §7). Falls back to that absolute
 * format once the gap reaches 7 days, so nothing ever reads
 * "312 days ago".
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

  return formatAdminDateTime(date);
}
