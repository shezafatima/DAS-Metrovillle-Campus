"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { MessageStatus } from "@/lib/messages/statuses";
import { useNotifications } from "@/components/admin/notifications/notifications-provider";

export interface MarkReadOnOpenProps {
  id: string;
  status: MessageStatus;
}

/**
 * Fires the conditional `new → read` POST once per mount, only when the
 * status *at mount* was "new" (research §5: no GET side effects, and
 * the layout re-renders only via `router.refresh()`).
 *
 * The parent renders this component unconditionally with `key={id}`
 * (see the detail page). `router.refresh()` keeps it mounted, so it
 * acts once per visit to the page. A message set back to New while the
 * page is open is not marked read again until the next visit (spec US3
 * scenario 4; sp.analyze H1) — never render this conditionally on the
 * status.
 */
export function MarkReadOnOpen({ id, status }: MarkReadOnOpenProps) {
  const router = useRouter();
  const { refreshNow } = useNotifications();
  const statusAtOpen = useRef(status);
  const fired = useRef(false);

  useEffect(() => {
    if (statusAtOpen.current !== "new" || fired.current) return;
    fired.current = true;

    fetch(`/api/admin/messages/${id}/read`, { method: "POST" })
      .then(async (response) => {
        if (!response.ok) return;
        const body = await response.json();
        if (body.changed) {
          router.refresh();
          refreshNow();
        }
      })
      .catch(() => {
        // Silent by contract — the admin can set the status manually.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return null;
}
