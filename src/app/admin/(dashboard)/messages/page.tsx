import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/dal";
import { listMessages } from "@/lib/messages/admin-queries";
import { MessagesTable } from "@/components/admin/messages/messages-table";
import { AdminListFilters } from "@/components/admin/admin-list-filters";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { messagesCopy } from "@/content/admin";
import { MESSAGE_STATUSES } from "@/lib/messages/statuses";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function AdminMessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireAdminPage("messages");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const page = typeof params.page === "string" ? Number(params.page) : 1;

  const result = await listMessages({
    q,
    status,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  });

  const fromParams = new URLSearchParams();
  if (q) fromParams.set("q", q);
  if (status && status !== "all") fromParams.set("status", status);
  if (result.page > 1) fromParams.set("page", String(result.page));
  const from = fromParams.toString();

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="font-bold text-2xl text-foreground">{messagesCopy.pageTitle}</h1>
      <AdminListFilters
        searchPlaceholder={messagesCopy.filters.searchPlaceholder}
        select={{
          param: "status",
          label: messagesCopy.filters.statusLabel,
          allLabel: messagesCopy.filters.statusAll,
          options: MESSAGE_STATUSES.map((s) => ({ value: s.key, label: s.label })),
        }}
      />
      <MessagesTable rows={result.items} filtered={Boolean(q || (status && status !== "all"))} from={from} />
      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/messages"
        searchParams={{ q, status }}
        copy={messagesCopy.pagination}
      />
    </div>
  );
}
