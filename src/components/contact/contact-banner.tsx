import { PageBanner } from "@/components/site-shell/page-banner";
import { contactCopy } from "@/content/contact";

export function ContactBanner() {
  return (
    <PageBanner
      title={contactCopy.banner.title}
      trail={["Contact"]}
      breadcrumbHome={contactCopy.banner.breadcrumbHome}
      backgroundImage="/images/contact/banner.webp"
    />
  );
}
