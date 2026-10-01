"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "cn";

/**
 * Base UI's Menu, wrapped the same way popover.tsx wraps its Popover
 * (010 research §8). Popover is for panels; this is for lists of
 * actions: role="menu", arrow-key movement between items, Escape and
 * outside-click to close, close-on-select, and focus returning to the
 * trigger all come from Base UI itself.
 */
const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuTrigger = MenuPrimitive.Trigger;
const DropdownMenuGroup = MenuPrimitive.Group;

function DropdownMenuContent({
  className,
  children,
  sideOffset = 8,
  side = "bottom",
  align = "end",
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup> &
  Pick<React.ComponentProps<typeof MenuPrimitive.Positioner>, "sideOffset" | "side" | "align">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner sideOffset={sideOffset} side={side} align={align} className="z-50">
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "min-w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-background p-1 text-foreground shadow-lg outline-none",
            "motion-safe:transition-all motion-safe:duration-(--motion-medium) data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
            className,
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

const itemClasses =
  "flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 text-sm outline-none data-highlighted:bg-muted data-highlighted:text-foreground [&_svg]:size-4 [&_svg]:shrink-0";

function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Item>) {
  return <MenuPrimitive.Item data-slot="dropdown-menu-item" className={cn(itemClasses, className)} {...props} />;
}

function DropdownMenuLinkItem({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.LinkItem>) {
  return (
    <MenuPrimitive.LinkItem data-slot="dropdown-menu-link-item" className={cn(itemClasses, className)} {...props} />
  );
}

function DropdownMenuGroupLabel({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.GroupLabel>) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-group-label"
      className={cn("px-2 py-1.5 text-muted-foreground text-xs", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
};
