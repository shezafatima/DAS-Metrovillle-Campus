import { PagePlaceholder } from "@/components/site-shell/page-placeholder";
import { formatSlugTitle } from "@/lib/format-slug";

export default async function AboutDetailPage({
  params,
}: PageProps<"/about/[slug]">) {
  const { slug } = await params;
  return <PagePlaceholder title={`About — ${formatSlugTitle(slug)}`} />;
}
