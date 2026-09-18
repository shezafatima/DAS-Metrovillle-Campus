import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/dal";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdminSession();
  return <AdminPlaceholder title="Settings" />;
}
