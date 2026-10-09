import { AnchoredPage } from "@/components/site-shell/anchored-sections";
import { pageSections } from "@/content/site-shell";

export default function AcademicsPage() {
  return <AnchoredPage title="Academics" sections={pageSections.academics} />;
}
