import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/dal";
import { listUsers } from "@/lib/users/queries";
import { UserPanel } from "@/components/admin/users/user-panel";
import { UsersTable } from "@/components/admin/users/users-table";
import { UserCards } from "@/components/admin/users/user-card";
import { createUser } from "./actions";
import { usersCopy } from "@/content/admin";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

/**
 * User management (011 US1/US4) — main admin only. The check is here, not
 * in the layout or the sidebar: a content manager who types this URL is
 * redirected to the overview with the denied notice.
 */
export default async function AdminUsersPage() {
  const session = await requireAdminPage("main_admin");
  const users = await listUsers();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-bold text-2xl text-foreground">{usersCopy.pageTitle}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/users/activity" className="font-light text-foreground text-sm underline">
            {usersCopy.changeRecord}
          </Link>
          <UserPanel mode="create" action={createUser} triggerLabel={usersCopy.newUser} triggerVariant="default" />
        </div>
      </div>

      {/* Table from 1280px (the sidebar takes a quarter of narrower screens), stacked cards below — no sideways scrolling at 375px. */}
      <div className="hidden xl:block">
        <UsersTable users={users} currentUserId={session.userId} />
      </div>
      <div className="xl:hidden">
        <UserCards users={users} currentUserId={session.userId} />
      </div>
    </div>
  );
}
