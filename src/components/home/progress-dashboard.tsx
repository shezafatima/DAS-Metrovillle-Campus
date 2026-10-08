import type { IconType } from "react-icons";
import { FaBookOpen, FaChalkboardUser, FaSchool, FaUserGraduate } from "react-icons/fa6";
import { homeContent, type StatKey } from "@/content/home";
import { getPublicSettings } from "@/lib/settings/public";
import { SectionHeading } from "./section-heading";
import { StatCounter } from "./stat-counter";

// Font Awesome glyphs through react-icons (already in the stack, and used for the social icons): a graduate,
// an open book, a teacher at the board and a school.
const ICONS: Record<StatKey, IconType> = { students: FaUserGraduate, books: FaBookOpen, teachers: FaChalkboardUser, campuses: FaSchool };

/**
 * "Dar-e-Arqam Schools – Progress Dashboard" (006 US5): the four numbers
 * from Settings on a yellow band, each in a frosted-glass card with an icon, the number and one label (navy),
 * counting up once when seen.
 * If Settings can't be read, the 005 starting values show (FR-022).
 */
export async function ProgressDashboard() {
  const stats = await getPublicSettings("stats");
  const { heading, line, stats: labels } = homeContent.progressDashboard;
  return (
    <section aria-labelledby="dashboard-heading" className="bg-(--color-topbar) py-(--spacing-home-dashboard-y)" data-testid="progress-dashboard">
      <div className="mx-auto flex max-w-(--container-max-width) flex-col gap-6 px-(--container-gutter-x)">
        <SectionHeading id="dashboard-heading" heading={heading} line={line} tone="navy" />
        <ul className="mx-auto grid w-full max-w-(--container-home-stats-max-width) grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {labels.map(({ key, title }) => {
            const Icon = ICONS[key];
            return (
              <li
                key={key}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-surface/70 bg-surface/40 p-4 text-center text-primary shadow-[0_8px_24px_rgb(0_0_0/0.08)] backdrop-blur-md sm:p-5"
                data-testid={`stat-${key}`}
              >
                <Icon aria-hidden="true" className="size-(--spacing-home-counter-icon)" />
                <span className="font-body text-[2rem] leading-none sm:text-(length:--text-home-counter)">
                  <StatCounter value={stats[key]} />
                </span>
                <span className="font-body text-base uppercase sm:text-(length:--text-home-counter-label)">{title}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
