import { PagePlaceholder } from "@/components/site-shell/page-placeholder";
import { SignupSection } from "@/components/signup/signup-section";

// The signup band is placed here so it can be tested end to end before
// 006 (Home) builds the real page — it will keep the same
// <SignupSection source="home" /> placement then (spec.md "Placement").
export default function Home() {
  return (
    <>
      <PagePlaceholder title="Home" />
      <SignupSection source="home" />
    </>
  );
}
