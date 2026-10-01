"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notificationsCopy } from "@/content/admin";
import { formatRelativeTime } from "@/lib/relative-time";
import { useNotifications } from "@/components/admin/notifications/notifications-provider";

export interface NotificationPanelProps {
  /** Called after choosing an item, so the bell can close its popover. */
  onChooseItem?: () => void;
}

/**
 * The bell's panel content — empty state, the mixed messages/signups
 * list (already newest-first, ≤10, from context), the "see all" links
 * and "Mark all as read" (contracts/notification-ui.md).
 */
export function NotificationPanel({ onChooseItem }: NotificationPanelProps) {
  const { messagesNew, signupsNew, items, markAllRead } = useNotifications();
  const total = messagesNew + signupsNew;

  // Deferred to the next tick: closing the popover synchronously in the
  // same click that a Link's own navigation handler processes can race
  // the popup's unmount against the navigation, cancelling it.
  function chooseItem() {
    if (!onChooseItem) return;
    setTimeout(onChooseItem, 0);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {total === 0 ? (
        <p className="px-2 py-6 text-center text-muted-foreground text-sm">{notificationsCopy.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <Link
                href={item.href}
                onClick={chooseItem}
                className="flex flex-col gap-0.5 rounded-md px-2 py-2 hover:bg-secondary"
              >
                <span className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm">{item.title}</span>
                  <Badge variant="highlight">{notificationsCopy.newLabel}</Badge>
                </span>
                <span className="truncate text-muted-foreground text-sm">{item.description}</span>
                <span className="text-muted-foreground text-xs">{formatRelativeTime(new Date(item.timestamp))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-border border-t pt-2">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/messages"
            onClick={chooseItem}
            className="rounded-md bg-primary px-3 py-1.5 text-center font-bold text-primary-foreground text-xs hover:bg-admin-highlight hover:text-admin-highlight-foreground"
          >
            {notificationsCopy.seeAllMessages}
          </Link>
          <Link
            href="/admin/signups"
            onClick={chooseItem}
            className="rounded-md bg-primary px-3 py-1.5 text-center font-bold text-primary-foreground text-xs hover:bg-admin-highlight hover:text-admin-highlight-foreground"
          >
            {notificationsCopy.seeAllSignups}
          </Link>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={total === 0}
          onClick={() => markAllRead()}
          className="self-end"
        >
          {notificationsCopy.markAllRead}
        </Button>
      </div>
    </div>
  );
}
