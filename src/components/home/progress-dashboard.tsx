import Image from "next/image";
import { BookOpen, IdCard, PersonStanding, School } from "lucide-react";
import { homeContent, type StatKey } from "@/content/home";
import { getPublicSettings } from "@/lib/settings/public";
import { SectionHeading } from "./section-heading";
import { StatCounter } from "./stat-counter";

// The reference uses Font Awesome (address-card, leanpub, street-view, school);
// these are the matching lucide icons (no new icon set — Constitution II).
const ICONS: Record<StatKey, typeof IdCard> = { students: IdCard, books: BookOpen, teachers: PersonStanding, campuses: School };

/**
 * "Dar-e-Arqam Schools – Progress Dashboard" (006 US5): the four numbers
 * from Settings over the reference's red band, counting up once when seen.
 * If Settings can't be read, the 005 starting values show (FR-022).
 */
export async function ProgressDashboard() {
  const stats = await getPublicSettings("stats");
  const { heading, line, background, stats: labels } = homeContent.progressDashboard;
  return (
    <section aria-labelledby="dashboard-heading" className="relative overflow-hidden py-(--spacing-home-dashboard-y)" data-testid="progress-dashboard">
      <Image src={background.src} alt={background.alt} fill sizes="100vw" className="object-cover" />
      <div className="relative mx-auto flex max-w-(--container-max-width) flex-col gap-10 px-(--container-gutter-x)">
        <SectionHeading id="dashboard-heading" heading={heading} line={line} tone="light" />
        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {labels.map(({ key, title, caption }) => {
            const Icon = ICONS[key];
            return (
              <li key={key} className="flex flex-col items-center gap-2 text-center text-white" data-testid={`stat-${key}`}>
                <Icon aria-hidden="true" className="size-(--spacing-home-counter-icon)" />
                <span className="font-body text-(length:--text-home-counter) leading-none">
                  <StatCounter value={stats[key]} />
                </span>
                {title && <span className="font-body text-(length:--text-home-counter-label) uppercase">{title}</span>}
                <span className="font-body text-(length:--text-home-counter-label)">{caption}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
