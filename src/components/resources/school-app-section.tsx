import Image from "next/image";
import { BookOpen, ClipboardCheck, Megaphone, Play, Wallet, type LucideIcon } from "lucide-react";
import { schoolApp } from "@/content/resources";
import { QrCode } from "./qr-code";

const featureIcons: Record<(typeof schoolApp.features)[number]["icon"], LucideIcon> = {
  "clipboard-check": ClipboardCheck,
  wallet: Wallet,
  megaphone: Megaphone,
  "book-open": BookOpen,
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-button text-(length:--text-button) font-semibold outline-none transition-colors duration-(--motion-fast) focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary";

/**
 * The School App section of the Resources page (`#mobile-apps`): a full-width navy band. Text, features and the two
 * buttons first; then a phone drawn in CSS around the app screenshot, and (from 1024px) a QR code to the Play Store.
 */
export function SchoolAppSection() {
  return (
    <section
      id={schoolApp.id}
      aria-labelledby={`${schoolApp.id}-heading`}
      className="anchor-section bg-primary py-(--spacing-home-section-y) text-white"
    >
      <div className="mx-auto grid max-w-(--container-max-width) gap-10 px-(--container-gutter-x) lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="flex flex-col gap-6">
          <p className="font-body text-sm font-bold uppercase tracking-widest text-gold">{schoolApp.eyebrow}</p>
          <h2 id={`${schoolApp.id}-heading`} className="font-bold font-heading text-h2 text-white">
            {schoolApp.heading}
          </h2>
          <p className="font-body text-body text-white">{schoolApp.line}</p>

          <ul className="grid gap-4 sm:grid-cols-2">
            {schoolApp.features.map((feature) => {
              const Icon = featureIcons[feature.icon];
              return (
                <li key={feature.id} className="flex items-center gap-3 font-body text-body text-white">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold text-primary">
                    <Icon aria-hidden="true" focusable="false" className="size-5" />
                  </span>
                  {feature.label}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={schoolApp.android.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonBase} bg-gold text-primary hover:bg-white`}
              >
                <Play aria-hidden="true" focusable="false" className="size-5 fill-current" />
                {schoolApp.android.label}
                <span className="sr-only">{schoolApp.externalSuffix}</span>
              </a>
              <a
                href={schoolApp.web.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonBase} border-2 border-white text-white hover:bg-white hover:text-primary`}
              >
                {schoolApp.web.label}
                <span className="sr-only">{schoolApp.externalSuffix}</span>
              </a>
            </div>
            <p className="font-body text-sm text-white">{schoolApp.iphoneNote}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-10">
          <div
            data-testid="phone-mockup"
            className="w-(--spacing-app-phone-width) max-w-full shrink-0 rounded-[2.5rem] border-[10px] border-white/25 bg-cta-hover p-1"
          >
            <div aria-hidden="true" className="mx-auto mb-1 h-1.5 w-16 rounded-full bg-white/40" />
            <Image
              src={schoolApp.screenshot.src}
              alt={schoolApp.screenshot.alt}
              width={schoolApp.screenshot.width}
              height={schoolApp.screenshot.height}
              sizes="(min-width: 1024px) 260px, 80vw"
              className="h-auto w-full rounded-3xl"
            />
          </div>
          <figure className="hidden flex-col items-center gap-3 lg:flex" data-testid="app-qr">
            <QrCode value={schoolApp.android.href} label={schoolApp.qr.label} className="size-(--spacing-app-qr-size) rounded-lg" />
            <figcaption className="font-body text-sm text-white">{schoolApp.qr.caption}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
