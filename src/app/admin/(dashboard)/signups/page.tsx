import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/dal";
import { listSignups } from "@/lib/signup/admin-queries";
import { SignupsTable } from "@/components/admin/signups/signups-table";
import { SignupsTableFilters } from "@/components/admin/signups/signups-table-filters";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { buttonVariants } from "@/components/ui/button";
import { signupsCopy } from "@/content/admin";

export const metadata: Metadata = { title: "Signups" };
export const dynamic = "force-dynamic";

export default async function AdminSignupsPage({
  searchParams,
}: PageProps<"/admin/signups">) {
  await requireAdminPage("careers");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const source = typeof params.source === "string" ? params.source : undefined;
  const page = typeof params.page === "string" ? Number(params.page) : 1;

  const result = await listSignups({
    q,
    source,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  });

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (source && source !== "all") exportParams.set("source", source);
  const exportQuery = exportParams.toString();
  const exportHref = `/api/admin/signups/export${exportQuery ? `?${exportQuery}` : ""}`;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-bold text-2xl text-foreground">{signupsCopy.pageTitle}</h1>
        <a href={exportHref} download className={buttonVariants({ variant: "outline" })}>
          {signupsCopy.export}
        </a>
      </div>
      <SignupsTableFilters />
      <SignupsTable rows={result.items} filtered={Boolean(q || (source && source !== "all"))} />
      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/signups"
        searchParams={{ q, source }}
        copy={signupsCopy.pagination}
      />
    </div>
  );
}
