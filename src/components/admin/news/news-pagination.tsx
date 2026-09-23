import { AdminPagination } from "@/components/admin/admin-pagination";
import { newsCopy } from "@/content/admin";

export interface AdminNewsPaginationProps {
  page: number;
  totalPages: number;
  /** Current search params (q, status, category), excluding page — carried forward on prev/next links. */
  searchParams: Record<string, string | undefined>;
}

/** Thin wrapper over the shared AdminPagination (see admin-pagination.tsx). */
export function NewsPagination(props: AdminNewsPaginationProps) {
  return <AdminPagination {...props} basePath="/admin/news" copy={newsCopy.pagination} />;
}
