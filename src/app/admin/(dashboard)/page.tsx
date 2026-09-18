import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata: Metadata = { title: "Overview" };

export default function AdminOverviewPage() {
  return <AdminPlaceholder title="Overview" />;
}
