import { AnchoredPage } from "@/components/site-shell/anchored-sections";
import { pageSections } from "@/content/site-shell";

export default function AboutPage() {
  return <AnchoredPage title="About" sections={pageSections.about} />;
}
