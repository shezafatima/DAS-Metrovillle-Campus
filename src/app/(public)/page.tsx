import type { Metadata } from "next";
import { BooksSection } from "@/components/home/books-section";
import { CareersCta } from "@/components/home/careers-cta";
import { HeroSlider } from "@/components/home/hero-slider";
import { InspirationWhyChoose } from "@/components/home/inspiration-why-choose";
import { LatestNews } from "@/components/home/latest-news";
import { PartnersStrip } from "@/components/home/partners-strip";
import { ProgressDashboard } from "@/components/home/progress-dashboard";
import { QuickAccessCards } from "@/components/home/quick-access-cards";
import { SalientFeatures } from "@/components/home/salient-features";
import { SectionBoundary } from "@/components/home/section-boundary";
import { homeContent } from "@/content/home";
import { ogImageUrl } from "@/lib/news/cloudinary-loader";
import { defaultsFor } from "@/lib/settings/defaults";
import { heroDefinition } from "@/lib/settings/groups/hero";
import { getPublicSettings, toPublicShape, type PublicHero } from "@/lib/settings/public";

const FALLBACK_OG_IMAGE = "/images/og-home.png";

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = homeContent.metadata;
  const hero = await getPublicSettings("hero");
  const first = hero.slides[0]?.desktop;
  const image = first && first.publicId ? ogImageUrl(first.url) : FALLBACK_OG_IMAGE;
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, type: "website", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/**
 * The home page (006), in the reference's section order
 * (contracts/home-sections.md). Static sections come from
 * src/content/home.ts; the hero, video, stats and book covers from Settings;
 * Latest News from News. Each data-backed section fails on its own and never
 * takes the page down (FR-027). Settings reads never throw (005), and the
 * public layout's `revalidate = 60` rebuilds the page at most once a minute.
 */
/**
 * The hero to show (FR-004): Settings' visible slides, or the 005 starting
 * slide when none is visible (a save can't leave none, but a read fallback or
 * a manual edit could), so the page never has an empty or broken top.
 */
function heroOrDefault(hero: PublicHero): PublicHero {
  if (hero.slides.length > 0) return hero;
  const fallback = toPublicShape("hero", { ...defaultsFor(heroDefinition), slides: (defaultsFor(heroDefinition).slides as Record<string, unknown>[]).map((s) => ({ ...s, deletedAt: null })) });
  return { displaySeconds: hero.displaySeconds || fallback.displaySeconds, slides: fallback.slides };
}

export default async function Home() {
  const [heroSettings, video] = await Promise.all([getPublicSettings("hero"), getPublicSettings("video")]);
  const hero = heroOrDefault(heroSettings);
  return (
    <>
      <h1 className="sr-only">{homeContent.pageHeading}</h1>
      <HeroSlider hero={hero} />
      <div id="after-hero" className="anchor-section" />
      <QuickAccessCards />
      <InspirationWhyChoose video={video} />
      <SectionBoundary name="latest-news" render={LatestNews} />
      <BooksSection />
      <SalientFeatures />
      <SectionBoundary name="progress-dashboard" render={ProgressDashboard} />
      <PartnersStrip />
      <CareersCta />
    </>
  );
}
