import { PagePlaceholder } from "@/components/site-shell/page-placeholder";
import { formatSlugTitle } from "@/lib/format-slug";

export default async function AdmissionDetailPage({
  params,
}: PageProps<"/admission/[slug]">) {
  const { slug } = await params;
  return <PagePlaceholder title={`Admission — ${formatSlugTitle(slug)}`} />;
}
