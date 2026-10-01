import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/dal";
import { DesignSystemDemo } from "./design-system-demo";

export const metadata: Metadata = { title: "Design system (temporary)" };

// Temporary, unlinked reference page — not one of the five nav sections
// (FR-021 keeps those fixed). Shows one real example of each shared
// admin UI pattern (data table, form, buttons, badges, modal,
// confirmation dialog, toasts, page header) that features 003/004/007
// reuse. Not part of the public site or the sidebar nav; reachable only
// by URL to whoever has admin access. Delete once those features have
// their own real pages built on these patterns.
export default async function DesignSystemPage() {
  await requireAdminPage("main_admin");
  return <DesignSystemDemo />;
}
