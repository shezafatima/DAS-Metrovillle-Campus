"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/admin/(dashboard)/actions";
import { profileMenuCopy } from "@/content/admin";

const ACCOUNT_PATH = "/admin/account";

/**
 * The initial button left of the bell (010 FR-001–004, contracts/
 * profile-menu-ui.md). Replaces the old sidebar-footer email + logout,
 * so there is exactly one logout control.
 *
 * Logout submits the unchanged 002 `logout` Server Action through a form
 * kept outside the popup (so it stays mounted after the menu closes).
 * The form carries `data-leaves-page`, so an Account page with unsaved
 * password text gets to confirm before the submit goes through
 * (use-unsaved-changes.ts guards the submit event).
 */
export function ProfileMenu({ email }: { email: string }) {
  const pathname = usePathname();
  const logoutForm = useRef<HTMLFormElement>(null);
  const initial = email.charAt(0).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={profileMenuCopy.triggerLabel}
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">{initial}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuGroupLabel className="truncate" title={email}>
              {email}
            </DropdownMenuGroupLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {/* closeOnClick: a client-side navigation keeps the layout (and this
              menu) mounted, and LinkItem defaults to staying open (FR-003). */}
          <DropdownMenuLinkItem
            closeOnClick
            render={<Link href={ACCOUNT_PATH} />}
            aria-current={pathname === ACCOUNT_PATH ? "page" : undefined}
          >
            <UserRound aria-hidden="true" />
            {profileMenuCopy.account}
          </DropdownMenuLinkItem>
          <DropdownMenuItem onClick={() => logoutForm.current?.requestSubmit()}>
            <LogOut aria-hidden="true" />
            {profileMenuCopy.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form ref={logoutForm} action={logout} data-leaves-page hidden />
    </>
  );
}
