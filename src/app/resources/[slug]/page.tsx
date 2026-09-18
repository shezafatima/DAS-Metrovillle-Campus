import { PagePlaceholder } from "@/components/site-shell/page-placeholder";
import { formatSlugTitle } from "@/lib/format-slug";

export default async function ResourcesDetailPage({
  params,
}: PageProps<"/resources/[slug]">) {
  const { slug } = await params;
  return <PagePlaceholder title={`Resources — ${formatSlugTitle(slug)}`} />;
}
