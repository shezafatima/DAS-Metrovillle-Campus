import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/dal";
import { getAdminPost } from "@/lib/news/admin-queries";
import { NewsEditor } from "@/components/admin/news/news-editor";

export async function generateMetadata(
  { params }: PageProps<"/admin/news/[id]">,
): Promise<Metadata> {
  const { id } = await params;
  const post = await getAdminPost(id);
  return { title: post?.title ?? "Edit post" };
}

export default async function EditNewsPostPage({ params }: PageProps<"/admin/news/[id]">) {
  await requireAdminPage("news");
  const { id } = await params;
  const post = await getAdminPost(id);
  if (!post) notFound();

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-bold text-2xl text-foreground">{post.title}</h1>
      <NewsEditor mode="edit" post={post} />
    </div>
  );
}
