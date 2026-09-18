import { PagePlaceholder } from "@/components/site-shell/page-placeholder";
import { formatSlugTitle } from "@/lib/format-slug";

export default async function NewsDetailPage({
  params,
}: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  return <PagePlaceholder title={`News — ${formatSlugTitle(slug)}`} />;
}
