import { PageBanner } from "@/components/site-shell/page-banner";
import { newsPublicCopy } from "@/content/news";

export interface NewsBannerProps {
  title: string;
  /** Breadcrumb trail after "Home", e.g. ["News"] or ["News", post title]. */
  trail: string[];
  dir?: "ltr" | "rtl";
}

/**
 * The list/category/detail page banner — now a thin wrapper over the
 * shared PageBanner (lifted here, research §14: the Contact page's
 * extracted banner values turned out identical to this one's).
 */
export function NewsBanner({ title, trail, dir }: NewsBannerProps) {
  return <PageBanner title={title} trail={trail} dir={dir} breadcrumbHome={newsPublicCopy.banner.breadcrumbHome} />;
}
