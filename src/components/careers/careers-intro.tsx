import { careersCopy } from "@/content/careers";

/** Static introduction (the shape of a future 014 page-content row). */
export function CareersIntro() {
  const { heading, paragraphs, placeholder } = careersCopy.intro;

  return (
    <section aria-labelledby="careers-intro-heading" className="py-(--spacing-contact-form-band-y)">
      <div className="mx-auto max-w-(--container-max-width) px-(--container-gutter-x)">
        <h2
          id="careers-intro-heading"
          data-placeholder={placeholder || undefined}
          className="font-bold font-heading text-h3 text-foreground"
        >
          {heading}
        </h2>
        <div className="mt-4 flex flex-col gap-3" data-placeholder={placeholder || undefined}>
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="font-body text-body text-foreground">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
