import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { AdminListFilters } from "@/components/admin/admin-list-filters";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { MarkRegistrationsOpened } from "@/components/admin/registrations/mark-registrations-opened";
import { RegistrationsTable } from "@/components/admin/registrations/registrations-table";
import { buttonVariants } from "@/components/ui/button";
import { registrationsAdminCopy } from "@/content/admin";
import { requireAdminPageOr404 } from "@/lib/dal";
import { classOptions, listRegistrations } from "@/lib/registration/admin-queries";
import { maybeSweepRegistrations } from "@/lib/registration/retention";

export const metadata: Metadata = { title: "Registrations" };
export const dynamic = "force-dynamic";

const copy = registrationsAdminCopy;

/**
 * Registrations list (013). Main admin only: a content manager, whatever they
 * hold, gets the not-found page, so even the section's existence stays hidden.
 */
export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPageOr404("main_admin");
  after(() => maybeSweepRegistrations());

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const className = typeof params.class === "string" ? params.class : undefined;
  const page = typeof params.page === "string" ? Number(params.page) : 1;

  const [result, classes] = await Promise.all([
    listRegistrations({ q, className, page: Number.isFinite(page) && page > 0 ? page : 1 }),
    classOptions(),
  ]);

  // The export carries the same search and class, so it contains exactly the filtered list.
  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (className) exportParams.set("class", className);
  const exportQuery = exportParams.toString();
  const exportHref = `/api/admin/registrations/export${exportQuery ? `?${exportQuery}` : ""}`;

  return (
    <div className="flex flex-col gap-4 p-6">
      <MarkRegistrationsOpened />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-bold text-2xl text-foreground">{copy.pageTitle}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/registrations/deleted" className={buttonVariants({ variant: "ghost" })}>
            {copy.deletedLink}
          </Link>
          <a href={exportHref} download className={buttonVariants({ variant: "outline" })}>
            {copy.export}
          </a>
        </div>
      </div>
      <AdminListFilters
        searchPlaceholder={copy.filters.searchPlaceholder}
        select={{
          param: "class",
          label: copy.filters.classLabel,
          allLabel: copy.filters.allClasses,
          options: classes.map((name) => ({ value: name, label: name })),
        }}
      />
      <RegistrationsTable rows={result.items} filtered={Boolean(q || className)} />
      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/registrations"
        searchParams={{ q, class: className }}
        copy={copy.pagination}
      />
    </div>
  );
}
