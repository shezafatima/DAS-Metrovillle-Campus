import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { DeletedTable } from "@/components/admin/registrations/deleted-table";
import { registrationsAdminCopy } from "@/content/admin";
import { requireAdminPageOr404 } from "@/lib/dal";
import { listDeleted } from "@/lib/registration/admin-queries";
import { maybeSweepRegistrations } from "@/lib/registration/retention";

export const metadata: Metadata = { title: "Deleted registrations" };
export const dynamic = "force-dynamic";

/** Registrations deleted in the last 30 days, restorable by the main admin only. */
export default async function AdminDeletedRegistrationsPage() {
  await requireAdminPageOr404("main_admin");
  after(() => maybeSweepRegistrations());

  const rows = await listDeleted(new Date());
  const copy = registrationsAdminCopy.deleted;

  return (
    <div className="flex flex-col gap-4 p-6">
      <Link href="/admin/registrations" className="text-primary text-sm hover:underline">
        {copy.back}
      </Link>
      <h1 className="font-bold text-2xl text-foreground">{copy.pageTitle}</h1>
      <DeletedTable rows={rows} />
    </div>
  );
}
