import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/dal";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata: Metadata = { title: "News" };

export default async function AdminNewsPage() {
  await requireAdminSession();
  return <AdminPlaceholder title="News" />;
}
