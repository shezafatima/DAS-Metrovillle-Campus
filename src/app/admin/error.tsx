"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { unavailableCopy } from "@/content/admin";

// Catches render errors from every admin segment below src/app/admin/
// layout.tsx — the login page and the whole dashboard. The only
// expected cause is the data store being unreachable while a server
// component looks up the session; without this boundary that surfaced
// as a raw framework error page. Shows the generic message required by
// 002 FR-014 and never the error itself (Next already strips server
// error messages in production, but we don't render them in dev either).
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Server log carries the matching digest; nothing technical reaches the page.
    console.error("[admin] page failed to render", error.digest ?? error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-surface px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-neutral-100 p-8 text-center shadow-card">
        <h1 className="font-heading text-h3 text-text">{unavailableCopy.title}</h1>
        <p className="font-body text-body text-text-muted">{unavailableCopy.body}</p>
        <Button type="button" onClick={() => retry()}>
          {unavailableCopy.retry}
        </Button>
      </div>
    </div>
  );
}
