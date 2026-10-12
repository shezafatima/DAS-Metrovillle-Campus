import { AboutSection } from "./about-section";
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
      <ul className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${columns}`}>
        {value.values.map((item) => {
          const Icon = valueIcons[item.icon];
          return (
            <li key={item.id} className={`flex flex-col gap-3 rounded-xl p-6 ${tile}`}>
              <Icon aria-hidden="true" focusable="false" className="size-8 text-primary" />
              <h3 className="break-words font-bold font-heading text-h3 text-primary">{item.name}</h3>
              {item.description && <p className="break-words font-body text-body text-text">{item.description}</p>}
            </li>
          );
        })}
      </ul>
    </AboutSection>
  );
}
