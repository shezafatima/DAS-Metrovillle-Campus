import { PagePlaceholder } from "@/components/site-shell/page-placeholder";
import { formatSlugTitle } from "@/lib/format-slug";

export default async function AcademicsDetailPage({
  params,
}: PageProps<"/academics/[slug]">) {
  const { slug } = await params;
  return <PagePlaceholder title={`Academics — ${formatSlugTitle(slug)}`} />;
}
