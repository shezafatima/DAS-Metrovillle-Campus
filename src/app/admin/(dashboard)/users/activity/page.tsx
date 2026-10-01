import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/dal";
import { listUserChanges } from "@/lib/users/queries";
import { ChangeRecordList } from "@/components/admin/users/change-record-list";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { changeRecordCopy } from "@/content/admin";

export const metadata: Metadata = { title: "Change record" };
export const dynamic = "force-dynamic";

/** The record of account and permission changes (011 US5) — main admin only. */
export default async function AdminUserActivityPage({ searchParams }: PageProps<"/admin/users/activity">) {
  await requireAdminPage("main_admin");

  const params = await searchParams;
  const requested = typeof params.page === "string" ? Number(params.page) : 1;
  const result = await listUserChanges({ page: Number.isFinite(requested) && requested > 0 ? requested : 1 });

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-bold text-2xl text-foreground">{changeRecordCopy.pageTitle}</h1>
        <Link href="/admin/users" className="font-light text-foreground text-sm underline">
          {changeRecordCopy.back}
        </Link>
      </div>
      <ChangeRecordList items={result.items} />
      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/users/activity"
        searchParams={{}}
        copy={changeRecordCopy.pagination}
      />
    </div>
  );
}
