"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { notificationsCopy } from "@/content/admin";
import { NotificationPanel } from "@/components/admin/notifications/notification-panel";
import { useNotifications } from "@/components/admin/notifications/notifications-provider";

/** The bell trigger + its panel (contracts/notification-ui.md). */
export function NotificationBell() {
  const { messagesNew, applicationsNew, loading, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const total = messagesNew + applicationsNew;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) refresh();
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            aria-label={notificationsCopy.bellLabel}
          >
            <span className="relative inline-flex">
              <Bell aria-hidden="true" />
              {(total > 0 || loading) && (
                <span
                  aria-hidden="true"
                  data-testid="notification-bell-dot"
                  className="absolute top-0 right-0 size-2 rounded-full bg-primary"
                />
              )}
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96" aria-label={notificationsCopy.bellLabel}>
        <NotificationPanel onChooseItem={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
