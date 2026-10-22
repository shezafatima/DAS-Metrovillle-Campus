import { AboutSection } from "@/components/about/about-section";
import type { AdmissionPage } from "@/lib/admission/schema";
import type { PublicClassLevel } from "@/lib/settings/public";

/**
 * Class Levels (014b, spec FR-031): the class levels and the age a child must be
 * on the reference date, as an accessible table from tablet width and as stacked
 * label/value rows on phones (below `md`). Only one of the two is ever in the
 * accessibility tree: the other is `display: none`. The header of the age column
 * names the reference date ("Age on 31 July"). All text is plain; React escapes it.
 *
 * Rendered only while there is at least one level (the page filters it through
 * `visibleSections`), so there is no empty state here.
 */
export function ClassLevelsSection({
  heading,
  ageHeader,
  levels,
  copy,
}: {
  heading: string;
  /** The reference date as written in the age column header: "31 July". */
  ageHeader: string;
  levels: PublicClassLevel[];
  copy: AdmissionPage["classLevels"];
}) {
  const ageHeading = copy.ageHeading(ageHeader);
  const cell = "border border-neutral-100 px-4 py-3 text-left align-top";
  return (
    <AboutSection id="class-levels" background="muted" heading={heading}>
      <div className="hidden md:block" data-testid="class-levels-table">
        <table className="w-full border-collapse border border-neutral-100 font-body text-body text-text">
          <caption className="sr-only">{copy.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={`${cell} bg-surface font-bold text-sm uppercase`}>
                {copy.levelHeading}
              </th>
              <th scope="col" className={`${cell} bg-surface font-bold text-sm uppercase`}>
                {ageHeading}
              </th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level) => (
              <tr key={level.id} className="bg-surface">
                <td className={cell}>{level.name}</td>
                <td className={cell}>{level.ageRule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden" data-testid="class-levels-list" aria-label={copy.caption}>
        {levels.map((level) => (
          <li key={level.id} className="rounded-md border border-neutral-100 bg-surface p-4 font-body text-body text-text">
            <dl className="flex flex-col gap-2">
              <div>
                <dt className="font-semibold text-sm text-text-muted uppercase">{copy.levelHeading}</dt>
                <dd className="font-bold">{level.name}</dd>
              </div>
              <div>
                <dt className="font-semibold text-sm text-text-muted uppercase">{ageHeading}</dt>
                <dd>{level.ageRule}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </AboutSection>
  );
}
