import { LazyMapFrame } from "@/components/contact/lazy-map-frame";
import { mapEmbedSrc } from "@/lib/contact-details";
import { contactCopy } from "@/content/contact";

export interface ContactMapProps {
  address: string;
  mapUrl: string;
  linkClass: string;
}

/** The map inside the navy half: a fixed-height lazy embed (no layout shift) and the "Open in Google Maps" fallback. */
export function ContactMap({ address, mapUrl, linkClass }: ContactMapProps) {
  return (
    <div>
      <h3 className="sr-only">{contactCopy.map.heading}</h3>
      <div id="contact-map" className="relative h-72 w-full overflow-hidden rounded-lg bg-surface sm:h-80">
        <LazyMapFrame src={mapEmbedSrc(address)} title={contactCopy.map.iframeTitle(address)} />
      </div>
      <p className="mt-3 font-body text-body">
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={`${linkClass} underline`}>
          {contactCopy.map.openInMaps}
        </a>
      </p>
    </div>
  );
}
