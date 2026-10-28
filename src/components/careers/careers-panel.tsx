import Image from "next/image";
import { careersCopy } from "@/content/careers";

/**
 * The navy half of the careers card: "Why join us" (the former introduction) and "What happens next". Both are
 * PENDING CLIENT APPROVAL (`data-placeholder`), and "What happens next" is deliberately generic.
 *
 * The picture (033) sits above the text on a phone or tablet, smaller; from 1024px it is below the text and takes
 * the rest of the panel's height (`flex-1`, drawn with `fill` so it never adds height of its own: the panel and the
 * form stay the same height).
 */
export function CareersPanel({ className }: { className?: string }) {
  const { intro, whatNext, panelImage } = careersCopy;
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
      {/* Last in the markup (the desktop order); a phone or tablet shows it first. */}
      <div className="relative order-first lg:order-none h-40 w-full overflow-hidden rounded-xl sm:h-52 sm:max-w-md lg:h-auto lg:max-w-none lg:min-h-48 lg:flex-1" data-testid="careers-panel-image">
        <Image src={panelImage.src} alt={panelImage.alt} fill sizes="(min-width: 1024px) 40rem, 100vw" loading="eager" className="object-cover object-[50%_70%]" />
      </div>
    </div>
  );
}
