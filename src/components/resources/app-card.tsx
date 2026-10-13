import { cn } from "cn";
import type { MobileApp } from "@/lib/resources/schema";
import type { mobileAppsCopy } from "@/content/resources/mobile-apps";
import { appIcons } from "./app-icons";

/**
 * One app card: icon, name, optional label, then either a download button
 * (a working `url`) or the muted unavailable note (`url === ""`, FR-016).
 * The hover lift and the button colour change are CSS only and motion-safe (FR-020).
 */
export function AppCard({ app, copy }: { app: MobileApp; copy: typeof mobileAppsCopy }) {
  const Icon = appIcons[app.icon];
  const noteId = `${app.id}-note`;
  const available = app.url !== "";
  return (
    <li
      data-testid="app-card"
      data-app-id={app.id}
      className={cn(
        "flex h-full flex-col gap-4 rounded-(--radius-card) bg-surface p-6 shadow-(--shadow-card)",
        "motion-safe:transition-transform motion-safe:duration-(--motion-fast) motion-safe:hover:-translate-y-(--spacing-resources-card-lift)",
      )}
    >
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-primary text-topbar">
        <Icon className="size-7" />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="font-bold font-heading text-xl text-primary">{app.name}</h3>
        {app.label && <p className="font-body text-body text-text-muted">{app.label}</p>}
      </div>
      <div className="mt-auto flex flex-col gap-2">
        {available ? (
          <>
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-describedby={app.linkType === "direct-download" ? noteId : undefined}
              className={cn(
                "inline-flex w-fit items-center justify-center rounded-(--radius-card) bg-primary px-5 py-3 font-body font-bold text-primary-foreground",
                "hover:bg-topbar hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "motion-safe:transition-colors motion-safe:duration-(--motion-fast)",
              )}
            >
              {copy.buttons[app.linkType]}
              <span className="sr-only">
                : {app.name} ({copy.newTab})
              </span>
            </a>
            {app.linkType === "direct-download" && (
              <p id={noteId} className="font-body text-sm text-text-muted">
                {copy.directDownloadNote}
              </p>
            )}
          </>
        ) : (
          <p className="font-body text-body text-text-muted">{copy.unavailable}</p>
        )}
      </div>
    </li>
  );
}
