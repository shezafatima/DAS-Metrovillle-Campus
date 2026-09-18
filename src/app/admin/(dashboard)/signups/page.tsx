import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/dal";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata: Metadata = { title: "Signups" };

export default async function AdminSignupsPage() {
  await requireAdminSession();
  return <AdminPlaceholder title="Signups" />;
}
