import { AboutSection } from "./about-section";
import { PersonPhoto } from "./person-photo";
import type { AboutBackground, TeamCard } from "@/lib/about/view";
import { isRtlScript } from "@/lib/rtl-text";

const rtl = (text: string) => (isRtlScript(text) ? ({ lang: "ur", dir: "rtl" } as const) : {});

export function ManagementTeamSection({
  heading,
  subheading,
  cards,
  background,
}: {
  heading: string;
  subheading?: string;
  cards: TeamCard[];
  background: AboutBackground;
}) {
  return (
    <AboutSection id="management-team" background={background} heading={heading} line={subheading}>
      {/* Wrapped flex, not a grid, so a short last row (or fewer cards than columns) is centred. Widths are one column of 1 / 2 / 3 / 4. */}
      <ul className="flex flex-wrap justify-center gap-6">
        {cards.map((card) => (
          <li
            key={card.id}
            data-placeholder={card.placeholder ? "true" : undefined}
            className={`flex w-full flex-col gap-3 rounded-xl p-4 md:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4.5rem)/4)] ${card.placeholder ? "border border-dashed border-text-muted" : ""}`}
          >
            <PersonPhoto photo={card.photo} name={card.name} />
            {card.placeholder && (
              <span className="w-fit rounded border border-text-muted px-2 py-0.5 font-body text-sm text-text-muted">
                Placeholder
              </span>
            )}
            <h3 {...rtl(card.name)} className="break-words font-bold font-heading text-h3 text-primary">
              {card.name}
            </h3>
            <p {...rtl(card.designation)} className="font-body text-body text-text">
              {card.designation}
            </p>
            <p className="font-body text-body text-text">{card.description}</p>
          </li>
        ))}
      </ul>
    </AboutSection>
  );
}
