"use client";

import { useEffect, useRef } from "react";
import { useNotifications } from "@/components/admin/notifications/notifications-provider";

/**
 * Fires the Applications list's "opened" marker once per mount (mirrors
 * messages' MarkReadOnOpen, 008). Silent on failure: the admin can still see
 * the list; the indicator simply doesn't clear until the next successful
 * poll or visit.
 */
export function MarkCareersOpened() {
  const { refreshNow } = useNotifications();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    fetch("/api/admin/careers/opened", { method: "POST" })
      .then((response) => {
        if (response.ok) refreshNow();
      })
      .catch(() => {
        // Silent by contract.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
