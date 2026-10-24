import { CareersForm } from "@/components/careers/careers-form";
import { CareersPanel } from "@/components/careers/careers-panel";
import { GlowFrame } from "@/components/glow/glow-frame";
import { careersCopy } from "@/content/careers";

/**
 * The careers card, like the contact page's: a navy panel on the left (first in reading order) and the form inside
 * the travelling gold border on the right. On a phone the form comes first, then the panel.
 */
export function CareersFormSection() {
  return (
    <section id="apply" aria-labelledby="careers-form-heading" className="bg-contact-form-band py-(--spacing-contact-form-band-y)">
      <div className="mx-auto max-w-(--container-max-width) px-3 sm:px-(--container-gutter-x)">
        <div className="grid grid-cols-1 overflow-hidden rounded-xl shadow-lg lg:grid-cols-2">
          <CareersPanel className="order-2 lg:order-1" />
          <div className="order-1 min-w-0 bg-(--color-home-muted-band) p-3 sm:p-8 lg:order-2 lg:p-10">
            <GlowFrame faceClassName="bg-surface p-4 sm:p-6">
              <h2 id="careers-form-heading" className="mb-5 font-bold font-heading text-h2 text-primary">
                {careersCopy.form.heading}
              </h2>
              <CareersForm />
            </GlowFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
