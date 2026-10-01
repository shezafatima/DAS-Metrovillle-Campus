import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/dal";
import { NewsEditor } from "@/components/admin/news/news-editor";

export const metadata: Metadata = { title: "New post" };

export default async function NewNewsPostPage() {
  await requireAdminPage("news");

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-bold text-2xl text-foreground">New post</h1>
      <NewsEditor mode="create" />
    </div>
  );
}
