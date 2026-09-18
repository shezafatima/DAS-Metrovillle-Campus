import { PagePlaceholder } from "@/components/site-shell/page-placeholder";
import { formatSlugTitle } from "@/lib/format-slug";

export default async function PortalDetailPage({
  params,
}: PageProps<"/portal/[slug]">) {
  const { slug } = await params;
  return <PagePlaceholder title={`Portal — ${formatSlugTitle(slug)}`} />;
}
