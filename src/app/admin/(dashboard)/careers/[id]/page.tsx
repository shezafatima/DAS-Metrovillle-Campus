import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/dal";
import { getApplication } from "@/lib/careers/admin-queries";
import { ApplicationDetail } from "@/components/admin/careers/application-detail";

export const metadata: Metadata = { title: "Application" };
export const dynamic = "force-dynamic";

export default async function AdminApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminPage("careers");

  const { id } = await params;
  const application = await getApplication(id);
  if (!application) notFound();

  // Only the main admin may delete (the DELETE route enforces it as well).
  return <ApplicationDetail application={application} canDelete={session.role === "main_admin"} />;
}
