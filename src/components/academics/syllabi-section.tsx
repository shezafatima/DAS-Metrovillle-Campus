import { AboutSection } from "@/components/about/about-section";
import type { AboutBackground } from "@/lib/about/view";
import type { SyllabiCopy } from "@/content/academics/dynamic-sections";
import type { PublicSyllabusLevel } from "@/lib/settings/public";
import { SyllabiTabs } from "./syllabi-tabs";

/** One level's content: a heading per subject, then its groups (optional sub-heading, intro paragraphs, bulleted topics). */
function LevelPanel({ level }: { level: PublicSyllabusLevel }) {
  return (
    <>
      {level.subjects.map((subject) => (
        <div key={subject.id} className="flex flex-col gap-4" data-testid="syllabus-subject">
          <h3 className="font-bold font-heading text-h3 text-primary">{subject.name}</h3>
          {subject.groups.map((group) => (
            <div key={group.id} className="flex flex-col gap-3">
              {group.heading && <h4 className="font-bold font-heading text-body text-text">{group.heading}</h4>}
              {group.paragraphs.map((paragraph, index) => (
                <p key={index} className="max-w-prose font-body text-body text-text">
                  {paragraph}
                </p>
              ))}
              {group.topics.length > 0 && (
                <ul className="flex max-w-prose list-disc flex-col gap-1.5 pl-6 font-body text-body text-text">
                  {group.topics.map((topic, index) => (
                    <li key={index}>{topic}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/**
 * Syllabi (014b, spec FR-017): one tab per level (a picker on phones) with each
 * level's subjects, group sub-headings, intro paragraphs and bulleted topics.
 * Every level's content is rendered here on the server and handed to the tabs,
 * so it is in the page for search engines and without JavaScript. All text is
 * plain: React escapes it. Rendered only while at least one level has content
 * (the page filters it through `visibleSections`).
 */
export function SyllabiSection({
  heading,
  levels,
  copy,
  background,
}: {
  heading: string;
  levels: PublicSyllabusLevel[];
  copy: SyllabiCopy;
  background: AboutBackground;
}) {
  return (
    <AboutSection id="syllabi" background={background} heading={heading}>
      <SyllabiTabs
        levels={levels.map(({ id, name, slug }) => ({ id, name, slug }))}
        panels={levels.map((level) => (
          <LevelPanel key={level.id} level={level} />
        ))}
        copy={copy}
      />
    </AboutSection>
  );
}
