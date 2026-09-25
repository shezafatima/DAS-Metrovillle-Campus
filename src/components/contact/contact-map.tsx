import { LazyMapFrame } from "@/components/contact/lazy-map-frame";
import { mapEmbedSrc } from "@/lib/contact-details";
import { contactCopy } from "@/content/contact";

export interface ContactMapProps {
  address: string;
  mapUrl: string;
}

export function ContactMap({ address, mapUrl }: ContactMapProps) {
  return (
    <section className="mx-auto max-w-(--container-max-width) px-(--container-gutter-x) py-8 text-center">
      <h2 className="font-heading text-(length:--text-contact-map-heading) font-(--text-contact-map-heading--font-weight) text-contact-map-heading">
        {contactCopy.map.heading}
      </h2>
      <div className="relative mt-6 h-(--spacing-contact-map-height) w-full bg-surface">
        <LazyMapFrame src={mapEmbedSrc(address)} title={contactCopy.map.iframeTitle(address)} />
      </div>
      <p className="mt-3 font-body text-body text-foreground">
        <span data-placeholder>{address}</span> ·{" "}
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
          {contactCopy.map.openInMaps}
        </a>
      </p>
    </section>
  );
}
