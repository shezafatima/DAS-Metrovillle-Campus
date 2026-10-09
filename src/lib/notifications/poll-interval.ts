/**
 * How often NotificationsProvider polls while the tab is visible.
 * Overridable only for tests — production always gets the 60s default
 * (research.md §3; plan.md's testability seam for the live-update E2E
 * spec, which can't wait 60 real seconds).
 */
export const NOTIFICATIONS_POLL_MS = Number(process.env.NEXT_PUBLIC_NOTIFICATIONS_POLL_MS) || 60_000;
