import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/dal";

export const metadata: Metadata = { title: "Settings" };

/** Settings has no page of its own: it opens on the first group (after the access check). */
export default async function AdminSettingsPage() {
  await requireAdminPage("settings");
  redirect("/admin/settings/contact");
}
