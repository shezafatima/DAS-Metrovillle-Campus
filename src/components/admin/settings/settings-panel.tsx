"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { confirmPagesPanel, confirmSettingsPanel } from "@/app/admin/(dashboard)/settings/actions";
import { AdminConfirmDeleteDialog } from "@/components/admin/admin-delete-dialog";
import { toast } from "@/components/ui/toaster";
import { settingsCopy } from "@/content/admin";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import { PANELS, isPanelKey } from "@/lib/settings/panels";
import { cn } from "cn";
import { usePanelUnsaved } from "./unsaved-panels";

/**
 * One collapsible Settings panel (014, contracts/tabs-and-panels.md): a
 * sticky header row (toggle, "Unsaved changes" badge, "View on site") and a
 * body. The disclosure pattern (a real button with aria-expanded) gives
 * keyboard use and the expanded state with no extra code; only the header
 * row is sticky, so it stays visible while any part of the panel is on
 * screen. A collapsed body is `hidden`, not unmounted, so its edits survive.
 * Opening `/admin/settings/<tab>#<anchor>` opens that panel and scrolls to it.
 *
 * A seeded section (014b) shows a notice that it awaits the client's confirmation, with a
 * "Mark as confirmed by client" button for someone who may change the panel. Saving never clears it.
 */
export function SettingsPanel({
  panel,
  title,
  anchor,
  viewOnSite,
  status,
  warning,
  pending,
  canConfirm = false,
  children,
}: {
  panel: string;
  title: string;
  anchor: string;
  viewOnSite: string;
  /** What the public sees now (020, Admission window). */
  status?: string;
  /** A problem to fix (013, no classes listed while open). */
  warning?: string;
  /** Set while seeded content awaits the client's confirmation (014b): where it was copied from, and when. */
  pending?: { source: string; seededAt: string } | null;
  /** The user may change this panel, so they may also mark it as confirmed. */
  canConfirm?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const unsaved = usePanelUnsaved(panel);
  const titleId = `${anchor}-title`;
  const bodyId = `${anchor}-body`;

  async function markConfirmed() {
    if (!isPanelKey(panel)) return;
    const confirm = PANELS[panel].saveAccess === "settings" ? confirmSettingsPanel : confirmPagesPanel;
    try {
      const result = await confirm({ panel });
      if (result.status === "success") {
        setConfirmed(true);
        toast({ title: settingsCopy.pending.confirmed(title), type: "success" });
      } else {
        toast({ title: result.error === "forbidden" ? settingsCopy.toasts.forbidden : result.error === "unauthorized" ? settingsCopy.toasts.unauthorized : settingsCopy.pending.failed, type: "error" });
      }
    } catch {
      toast({ title: settingsCopy.pending.failed, type: "error" });
    }
  }

  useEffect(() => {
    function openIfTargeted() {
      if (window.location.hash !== `#${anchor}`) return;
      setOpen(true);
      // After the body is shown, so the whole panel is measured.
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: "start" }));
    }
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, [anchor]);

  return (
    <section id={anchor} aria-labelledby={titleId} data-testid="settings-panel" data-panel={panel} className="scroll-mt-4 rounded-lg border border-border">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-t-lg border-border border-b bg-background px-4 py-3">
        <h2 id={titleId} className="min-w-0 flex-1 font-bold text-foreground text-lg">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((value) => !value)}
            className="flex w-full items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 transition-transform", !open && "-rotate-90")} />
            <span className="min-w-0">{title}</span>
          </button>
        </h2>
        {unsaved && (
          <span data-testid="panel-unsaved" className="rounded-full border border-primary px-2 py-0.5 font-semibold text-primary text-xs">
            {settingsCopy.unsavedBadge}
          </span>
        )}
        <Link href={viewOnSite} className="font-light text-primary text-sm underline-offset-4 hover:underline" data-testid="view-on-site">
          {settingsCopy.viewOnSite}
          <span className="sr-only">: {title}</span>
        </Link>
      </div>
      <div id={bodyId} hidden={!open} className="flex flex-col gap-4 p-4">
        {status && (
          <p role="status" data-testid="settings-status" className="font-semibold text-foreground text-sm">
            {status}
          </p>
        )}
        {pending && !confirmed && (
          <div role="status" data-testid="pending-notice" className="flex flex-col gap-3 rounded-md border border-border bg-muted px-3 py-2">
            <p className="font-semibold text-foreground text-sm">{settingsCopy.pending.notice(pending.source, formatAdminDateTime(new Date(pending.seededAt)))}</p>
            {canConfirm && (
              <div>
                <AdminConfirmDeleteDialog itemName={title} copy={settingsCopy.pending.dialog} triggerLabel={settingsCopy.pending.confirmButton} onConfirm={markConfirmed} />
              </div>
            )}
          </div>
        )}
        {warning && (
          <p role="alert" data-testid="settings-warning" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 font-semibold text-foreground text-sm">
            {warning}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
