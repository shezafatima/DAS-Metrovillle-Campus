import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/dal";
import { canAccess } from "@/lib/permissions";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings has no page of its own (014 FR-002): it opens on the first tab the
 * user may open. Site-wide needs Settings; every page tab with panels needs
 * Pages, Home being the first. A user with neither is refused here.
 */
export default async function AdminSettingsPage() {
  const session = await requireAdminPage("settings_or_pages");
  redirect(canAccess(session, "settings") ? "/admin/settings/site-wide" : "/admin/settings/home");
}
