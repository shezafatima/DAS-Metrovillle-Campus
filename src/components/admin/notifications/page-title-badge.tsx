"use client";

import { useEffect } from "react";
import { formatCount } from "@/lib/format-count";
import { useNotifications } from "@/components/admin/notifications/notifications-provider";

const PREFIX_PATTERN = /^\(\d+\+?\) /;

/**
 * Prefixes the browser tab title with the combined new count (spec
 * FR-024, P3). Renders nothing.
 *
 * On a client-side navigation, React can replace the whole `<title>`
 * element for the new route (not just its text) and set it in more than
 * one step — observed going through an intermediate empty string before
 * settling. This component observes `document.head` (not the original
 * `<title>` node, which a navigation can detach) and debounces its own
 * reaction, so it only re-derives once the title has stopped changing
 * for a moment, however many steps or element swaps Next's update took
 * (research.md §8).
 */
export function PageTitleBadge() {
  const { messagesNew, applicationsNew } = useNotifications();
  const total = messagesNew + applicationsNew;

  useEffect(() => {
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    function apply() {
      const current = document.title;
      const base = current.replace(PREFIX_PATTERN, "");
      const desired = total > 0 ? `(${formatCount(total)}) ${base}` : base;
      if (current !== desired) {
        document.title = desired;
      }
    }

    function scheduleApply() {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(apply, 100);
    }

    scheduleApply();

    // Observe document.head, not just the <title> element itself: React
    // can replace the whole <title> node for a new route rather than
    // editing its text in place, which a MutationObserver bound only to
    // the original node would never see. apply() itself is a no-op once
    // document.title already matches, so reacting to our own write here
    // just re-confirms it and stops.
    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.head, { childList: true, characterData: true, subtree: true });

    return () => {
      observer.disconnect();
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [total]);

  return null;
}
