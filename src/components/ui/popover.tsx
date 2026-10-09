"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "cn";

/**
 * Base UI's Popover, wrapped the same way src/components/ui/dialog.tsx
 * wraps @base-ui/react/dialog (research.md §4) — the first Popover
 * primitive in this design system. Escape-to-close, outside-click-to-
 * close, focus handling and ARIA wiring all come from Base UI itself.
 */
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverClose = PopoverPrimitive.Close;

function PopoverPortal(props: React.ComponentProps<typeof PopoverPrimitive.Portal>) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />;
}

function PopoverPositioner({
  className,
  sideOffset = 8,
  side = "bottom",
  align = "end",
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Positioner>) {
  return (
    <PopoverPrimitive.Positioner
      data-slot="popover-positioner"
      sideOffset={sideOffset}
      side={side}
      align={align}
      className={cn("z-50", className)}
      {...props}
    />
  );
}

function PopoverContent({ className, children, ...props }: React.ComponentProps<typeof PopoverPrimitive.Popup>) {
  return (
    <PopoverPortal>
      <PopoverPositioner>
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "rounded-lg border border-border bg-background p-2 text-foreground shadow-lg outline-none",
            "motion-safe:transition-all motion-safe:duration-(--motion-medium) data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
            className,
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPositioner>
    </PopoverPortal>
  );
}

export { Popover, PopoverTrigger, PopoverClose, PopoverPortal, PopoverPositioner, PopoverContent };
