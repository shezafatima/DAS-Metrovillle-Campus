import { AboutSection } from "./about-section";
import { AboutGlowGrid } from "./glow-grid";
import { Paragraphs } from "./paragraphs";
import { valueIcons } from "./value-icons";
import type { CoreValues } from "@/lib/about/schema";
import { valuesColumns, type AboutBackground } from "@/lib/about/view";

export function CoreValuesSection({ value, background }: { value: CoreValues; background: AboutBackground }) {
  const columns = valuesColumns(value.values.length) === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  const tile = background === "surface" ? "bg-(--color-home-muted-band)" : "bg-surface";
  return (
    <AboutSection id="core-values" background={background} heading={value.heading} line={value.subheading}>
      <div className="mx-auto flex max-w-prose flex-col gap-4 text-center">
        <Paragraphs text={value.intro} />
      </div>
      <AboutGlowGrid className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${columns}`}>
        {value.values.map((item, index) => {
          const Icon = valueIcons[item.icon];
          return (
            <li
              key={item.id}
              style={{ "--about-glow-delay": `${-((index * 1.7) % 5).toFixed(1)}s` } as React.CSSProperties}
              className="about-value-card flex flex-col rounded-xl"
            >
              <span aria-hidden="true" className="about-glow-halo">
                <span className="about-glow-spin" />
              </span>
              <span aria-hidden="true" className="about-glow-ring">
                <span className="about-glow-spin" />
              </span>
              <div className={`about-value-card-face flex flex-1 flex-col gap-3 p-6 ${tile}`}>
                <Icon aria-hidden="true" focusable="false" className="size-8 text-primary" />
                <h3 className="break-words font-bold font-heading text-h3 text-primary">{item.name}</h3>
                {item.description && <p className="break-words font-body text-body text-text">{item.description}</p>}
              </div>
            </li>
          );
        })}
      </AboutGlowGrid>
    </AboutSection>
  );
}
