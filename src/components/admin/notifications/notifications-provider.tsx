"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "@/components/ui/toaster";
import { notificationsCopy } from "@/content/admin";
import type { NotificationItem } from "@/lib/notifications/types";
import { NOTIFICATIONS_POLL_MS } from "@/lib/notifications/poll-interval";

interface NotificationsState {
  messagesNew: number;
  signupsNew: number;
  items: NotificationItem[];
  /** True only until the very first fetch settles. */
  loading: boolean;
}

interface NotificationsContextValue extends NotificationsState {
  refresh: () => Promise<void>;
  /** Alias of refresh(), called by mutation sites after their own request succeeds. */
  refreshNow: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/**
 * The one client-side source of notification state — sidebar, bell and
 * page title all read this, so they can never disagree (research.md
 * §3, §5). Seeded from the server for a flash-free first paint; a
 * failed fetch leaves the previous state untouched and shows no error
 * (spec FR-026).
 */
export function NotificationsProvider({
  initialMessagesNew,
  initialSignupsNew,
  children,
}: {
  initialMessagesNew: number;
  initialSignupsNew: number;
  children: ReactNode;
}) {
  const [state, setState] = useState<NotificationsState>({
    messagesNew: initialMessagesNew,
    signupsNew: initialSignupsNew,
    items: [],
    loading: true,
  });
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const response = await fetch("/api/admin/notifications");
      if (response.ok) {
        const body = await response.json();
        setState({ messagesNew: body.messagesNew, signupsNew: body.signupsNew, items: body.items, loading: false });
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    } finally {
      inFlight.current = false;
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setState((prev) => ({ ...prev, messagesNew: 0, signupsNew: 0, items: [] }));
    try {
      const response = await fetch("/api/admin/notifications/read", { method: "POST" });
      if (!response.ok) {
        toast({ title: notificationsCopy.toasts.markAllReadFailed, type: "error" });
        await refresh();
      }
    } catch {
      toast({ title: notificationsCopy.toasts.markAllReadFailed, type: "error" });
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    // Deliberate fetch-on-mount: populates `items` (never SSR-seeded)
    // and reconciles the SSR-seeded counts against the live database.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh() is a stable async fetch-then-setState, the standard "fetch in an effect" shape (react.dev/learn/synchronizing-with-effects#fetching-data), not a synchronous render-phase setState.
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ~60s polling while the tab is visible; paused while hidden, with an
  // immediate refresh on becoming visible again (spec FR-020/FR-022).
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (interval) return;
      interval = setInterval(refresh, NOTIFICATIONS_POLL_MS);
    }

    function stop() {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        refresh();
        start();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NotificationsContext.Provider value={{ ...state, refresh, refreshNow: refresh, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
