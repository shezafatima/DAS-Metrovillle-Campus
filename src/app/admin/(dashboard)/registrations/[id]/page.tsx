import type { Metadata } from "next";
import { after } from "next/server";
import { notFound } from "next/navigation";
import { RegistrationDetail } from "@/components/admin/registrations/registration-detail";
import { requireAdminPageOr404 } from "@/lib/dal";
import { getRegistration } from "@/lib/registration/admin-queries";
import { maybeSweepRegistrations } from "@/lib/registration/retention";

export const metadata: Metadata = { title: "Registration" };
export const dynamic = "force-dynamic";

export default async function AdminRegistrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPageOr404("main_admin");
  after(() => maybeSweepRegistrations());

  const { id } = await params;
  const registration = await getRegistration(id);
  if (!registration) notFound();

  return <RegistrationDetail registration={registration} />;
}
