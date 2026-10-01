"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "cn";

/**
 * A panel that slides in from the right over the page (011 user panel).
 * Built on the same Base UI dialog as `dialog.tsx`, so focus is trapped,
 * Escape and an outside click close it, and it is modal for assistive
 * technology. Full width on phones, a fixed comfortable width from 640px.
 */
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetContent({
  className,
  children,
  closeLabel = "Close",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Popup> & { closeLabel?: string }) {
  return (
    <SheetPrimitive.Portal data-slot="sheet-portal">
      <SheetPrimitive.Backdrop
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-black/50 motion-safe:transition-opacity motion-safe:duration-(--motion-medium) data-starting-style:opacity-0 data-ending-style:opacity-0"
      />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-4 overflow-y-auto border-l border-border bg-background p-6 text-foreground shadow-lg outline-none sm:max-w-md",
          "motion-safe:transition-transform motion-safe:duration-(--motion-medium) data-starting-style:translate-x-full data-ending-style:translate-x-full",
          className,
        )}
        {...props}
      >
        {children}
        <SheetClose
          className="absolute top-4 right-4 rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={closeLabel}
        >
          <X className="size-4" />
        </SheetClose>
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 pr-6", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-bold text-lg text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("font-light text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
