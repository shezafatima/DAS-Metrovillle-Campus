import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { loginCopy } from "@/content/admin";
import { logout } from "@/app/admin/(dashboard)/actions";

interface AdminTopBarProps {
  email: string;
  menuSlot?: ReactNode;
}

export function AdminTopBar({ email, menuSlot }: AdminTopBarProps) {
  return (
    <div className="flex h-admin-topbar items-center justify-between border-b border-neutral-100 px-4">
      <div className="flex items-center gap-2">{menuSlot}</div>
      <div className="flex items-center gap-4">
        <span className="font-button text-sm text-text-muted">{email}</span>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            {loginCopy.logout}
          </Button>
        </form>
      </div>
    </div>
  );
}
