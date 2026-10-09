import { AnchoredPage } from "@/components/site-shell/anchored-sections";
import { pageSections } from "@/content/site-shell";

export default function AdmissionPage() {
  return <AnchoredPage title="Admission" sections={pageSections.admission} />;
}
