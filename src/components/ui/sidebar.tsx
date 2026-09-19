"use client";

import * as React from "react";
import Link from "next/link";
import { Drawer } from "@base-ui/react/drawer";
import { Tooltip } from "@base-ui/react/tooltip";
import { PanelLeft } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

/**
 * shadcn/ui's sidebar component, adapted to this project's Base UI
 * primitives instead of Radix (Constitution II — no new dependency;
 * this project's shadcn config, components.json "style": "base-nova",
 * is specifically the Base-UI-flavored registry). API surface
 * (SidebarProvider, Sidebar, SidebarTrigger, SidebarMenuButton, ...)
 * matches shadcn's upstream sidebar so it behaves as documented there.
 */

const SIDEBAR_COOKIE_NAME = "admin-sidebar-state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days — "remember the choice between visits"
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarState = "expanded" | "collapsed";

interface SidebarContextValue {
  state: SidebarState;
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

function setSidebarCookie(open: boolean) {
  try {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${open ? "expanded" : "collapsed"}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  } catch {
    // Cookies unavailable (e.g. blocked) — the choice just won't persist.
  }
}

interface SidebarProviderProps extends React.ComponentProps<"div"> {
  /** Initial expanded/collapsed state — pass the server-read cookie value here to avoid a flash. */
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [openMobile, setOpenMobile] = React.useState(false);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = openProp ?? internalOpen;

  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      } else {
        setInternalOpen(value);
      }
      setSidebarCookie(value);
    },
    [onOpenChange],
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((v) => !v);
    } else {
      setOpen(!open);
    }
  }, [isMobile, open, setOpen]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  const state: SidebarState = open ? "expanded" : "collapsed";

  const value = React.useMemo<SidebarContextValue>(
    () => ({ state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar }),
    [state, open, setOpen, openMobile, isMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": "var(--spacing-admin-sidebar)",
            "--sidebar-width-icon": "var(--spacing-admin-sidebar-icon)",
            ...style,
          } as React.CSSProperties
        }
        className={cn("flex min-h-full w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

interface SidebarProps extends React.ComponentProps<"div"> {
  collapsible?: "icon" | "none";
}

export function Sidebar({ collapsible = "icon", className, children, ...props }: SidebarProps) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Drawer.Root open={openMobile} onOpenChange={setOpenMobile}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/40 motion-safe:transition-opacity motion-safe:duration-(--motion-medium) data-starting-style:opacity-0 data-ending-style:opacity-0" />
          <Drawer.Viewport className="fixed inset-0 z-50 flex">
            <Drawer.Popup
              render={<nav aria-label="Admin" />}
              className="admin-theme flex h-full w-(--spacing-admin-sidebar-mobile) flex-col bg-sidebar text-sidebar-foreground outline-none motion-safe:transition-transform motion-safe:duration-(--motion-medium) data-starting-style:-translate-x-full data-ending-style:-translate-x-full"
              data-slot="sidebar"
            >
              <Drawer.Title className="sr-only">Admin navigation</Drawer.Title>
              {children}
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <nav
      aria-label="Admin"
      data-slot="sidebar"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      className={cn(
        "hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-(--motion-medium) lg:flex",
        state === "expanded" ? "w-(--spacing-admin-sidebar)" : "w-(--spacing-admin-sidebar-icon)",
        className,
      )}
      {...props}
    >
      {children}
    </nav>
  );
}

export function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar, isMobile } = useSidebar();
  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      aria-label={isMobile ? "Open menu" : "Toggle sidebar"}
      className={cn("size-8", className)}
      onClick={(event) => {
        props.onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft className="size-4" />
    </Button>
  );
}

export function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      data-slot="sidebar-rail"
      aria-label="Toggle sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      className={cn(
        "hidden w-2 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-border lg:block",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("flex flex-col gap-2 p-3", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden", className)}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("flex flex-col gap-2 p-3", className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group" className={cn("flex flex-col gap-1 px-2", className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  const { state } = useSidebar();
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "px-2 py-1 font-bold text-xs text-sidebar-foreground/60 uppercase tracking-wide",
        state === "collapsed" && "lg:sr-only",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("relative", className)} {...props} />;
}

interface SidebarMenuButtonProps extends Omit<React.ComponentProps<typeof Link>, "href"> {
  href: string;
  isActive?: boolean;
  tooltip?: string;
  icon?: React.ReactNode;
}

export const SidebarMenuButton = React.forwardRef<HTMLAnchorElement, SidebarMenuButtonProps>(
  ({ className, isActive, tooltip, icon, children, onClick, ...props }, ref) => {
    const { state, isMobile, setOpenMobile } = useSidebar();

    const button = (
      <Link
        ref={ref}
        data-slot="sidebar-menu-button"
        data-active={isActive}
        aria-current={isActive ? "page" : undefined}
        onClick={(event) => {
          onClick?.(event);
          if (isMobile) setOpenMobile(false);
        }}
        className={cn(
          "flex h-9 items-center gap-3 overflow-hidden rounded-md px-3 font-bold text-sm outline-none",
          "text-sidebar-foreground/80 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
          state === "collapsed" && !isMobile && "lg:justify-center lg:px-0",
          className,
        )}
        {...props}
      >
        {icon}
        <span className={cn(state === "collapsed" && !isMobile && "lg:hidden")}>{children}</span>
      </Link>
    );

    if (!tooltip || isMobile || state !== "collapsed") {
      return button;
    }

    return (
      <Tooltip.Root>
        <Tooltip.Trigger render={button} />
        <Tooltip.Portal>
          <Tooltip.Positioner side="right" sideOffset={8}>
            <Tooltip.Popup className="rounded-md border border-border bg-popover px-2.5 py-1.5 font-light text-xs text-popover-foreground shadow-md">
              {tooltip}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  },
);
SidebarMenuButton.displayName = "SidebarMenuButton";

export function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"span">) {
  const { state, isMobile } = useSidebar();
  return (
    <span
      data-slot="sidebar-menu-badge"
      className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2",
        state === "collapsed" && !isMobile && "lg:right-1 lg:top-1 lg:translate-y-0",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn("flex min-h-full flex-1 flex-col overflow-x-hidden", className)}
      {...props}
    />
  );
}
