import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/dal";
import { getPasswordChangedAt } from "@/lib/account";
import { AccountSummary } from "@/components/admin/account/account-summary";
import { AccountPanels } from "@/components/admin/account/account-panels";
import { accountCopy } from "@/content/admin";

export const metadata: Metadata = { title: accountCopy.pageTitle };
export const dynamic = "force-dynamic";

/**
 * Account page (010): change password (main admin only, since 011), password age, sign out other
 * devices. Reached from the profile menu only. Only the email and a
 * date reach the client — never any password data.
 */
export default async function AdminAccountPage() {
  const session = await requireAdminPage("any");
  const lastChangedAt = await getPasswordChangedAt(session.userId).catch(() => null);

  return (
    <div className="flex max-w-xl flex-col gap-4 p-6">
      <h1 className="font-bold text-2xl text-foreground">{accountCopy.pageTitle}</h1>
      <AccountSummary email={session.email} />
      <AccountPanels
        email={session.email}
        initialLastChangedAt={lastChangedAt?.toISOString() ?? null}
        canChangePassword={session.role === "main_admin"}
      />
    </div>
  );
}
