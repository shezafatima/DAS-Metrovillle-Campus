import type { Metadata } from "next";
import { after } from "next/server";
import { requireAdminPage } from "@/lib/dal";
import { maybeSweepCareers } from "@/lib/careers/retention";
import { listApplications } from "@/lib/careers/admin-queries";
import { ApplicationsTable } from "@/components/admin/careers/applications-table";
import { MarkCareersOpened } from "@/components/admin/careers/mark-careers-opened";
import { AdminListFilters } from "@/components/admin/admin-list-filters";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { buttonVariants } from "@/components/ui/button";
import { careersAdminCopy } from "@/content/admin";

export const metadata: Metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

export default async function AdminCareersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("careers");
  after(() => maybeSweepCareers());

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const page = typeof params.page === "string" ? Number(params.page) : 1;

  const result = await listApplications({ q, page: Number.isFinite(page) && page > 0 ? page : 1 });

  // The export carries the same search, so it contains exactly the filtered list.
  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  const exportQuery = exportParams.toString();
  const exportHref = `/api/admin/careers/export${exportQuery ? `?${exportQuery}` : ""}`;

  return (
    <div className="flex flex-col gap-4 p-6">
      <MarkCareersOpened />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-bold text-2xl text-foreground">{careersAdminCopy.pageTitle}</h1>
        <a href={exportHref} download className={buttonVariants({ variant: "outline" })}>
          {careersAdminCopy.export}
        </a>
      </div>
      <AdminListFilters searchPlaceholder={careersAdminCopy.filters.searchPlaceholder} />
      <ApplicationsTable rows={result.items} filtered={Boolean(q)} />
      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/careers"
        searchParams={{ q }}
        copy={careersAdminCopy.pagination}
      />
    </div>
  );
}
