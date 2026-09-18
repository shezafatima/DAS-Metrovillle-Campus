import { cn } from "cn";

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className={cn(
        "sr-only focus-visible:not-sr-only",
        "focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50",
        "focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2",
        "focus-visible:font-body focus-visible:text-sm focus-visible:text-surface",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      Skip to content
    </a>
  );
}
