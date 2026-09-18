import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/dal";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata: Metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  await requireAdminSession();
  return <AdminPlaceholder title="Messages" />;
}
