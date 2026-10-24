import { careersCopy } from "@/content/careers";

/**
 * The navy half of the careers card: "Why join us" (the former introduction) and "What happens next". Both are
 * PENDING CLIENT APPROVAL (`data-placeholder`), and "What happens next" is deliberately generic.
 */
export function CareersPanel({ className }: { className?: string }) {
  const { intro, whatNext } = careersCopy;
  return (
    <div className={`flex min-w-0 flex-col gap-8 bg-primary p-6 text-white sm:p-8 lg:p-10 ${className ?? ""}`}>
      <section aria-labelledby="careers-why-heading" data-placeholder={intro.placeholder || undefined} className="flex flex-col gap-4">
        <h2 id="careers-why-heading" className="font-bold font-heading text-h2 text-white">
          {intro.heading}
        </h2>
        {intro.paragraphs.map((paragraph) => (
          <p key={paragraph} className="font-body text-body text-white">
            {paragraph}
          </p>
        ))}
      </section>

      <section aria-labelledby="careers-next-heading" data-placeholder={whatNext.placeholder || undefined} className="flex flex-col gap-4">
        <h2 id="careers-next-heading" className="font-bold font-heading text-h2 text-white">
          {whatNext.heading}
        </h2>
        {whatNext.paragraphs.map((paragraph) => (
          <p key={paragraph} className="font-body text-body text-white">
            {paragraph}
          </p>
        ))}
      </section>
    </div>
  );
}
