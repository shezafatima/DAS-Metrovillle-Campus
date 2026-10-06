import Image from "next/image";
import { homeContent } from "@/content/home";
import { SectionHeading } from "./section-heading";

/** "Salient Features of Dar-e-Arqam Schools" (006 FR-012; design-tokens row 5): four icon cards. */
export function SalientFeatures() {
  const { heading, line, items } = homeContent.salientFeatures;
  return (
    <section aria-labelledby="salient-heading" className="bg-(--color-home-salient-band) pt-(--spacing-home-salient-top) pb-(--spacing-home-band-y)">
      <div className="mx-auto flex max-w-(--container-max-width) flex-col gap-10 px-(--container-gutter-x)">
        <SectionHeading id="salient-heading" heading={heading} line={line} />
        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col items-center gap-3 text-center">
              <Image src={item.image.src} alt={item.image.alt} width={item.image.width} height={item.image.height} className="size-(--spacing-home-salient-icon)" />
              <h3 className="font-bold font-heading text-(--color-home-salient-title) text-(length:--text-home-salient-title) uppercase leading-(--text-home-salient-title--line-height)">{item.title}</h3>
              <p className="font-body text-(--color-home-salient-title) text-body">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
