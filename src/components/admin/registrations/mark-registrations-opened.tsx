"use client";

import { useEffect, useRef } from "react";
import { useNotifications } from "@/components/admin/notifications/notifications-provider";

/**
 * Fires the Registrations list's "opened" marker once per mount (mirrors
 * MarkCareersOpened). Silent on failure.
 */
export function MarkRegistrationsOpened() {
  const { refreshNow } = useNotifications();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    fetch("/api/admin/registrations/opened", { method: "POST" })
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
