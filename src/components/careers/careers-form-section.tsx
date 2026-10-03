import { CareersForm } from "@/components/careers/careers-form";
import { careersCopy } from "@/content/careers";

export function CareersFormSection() {
  return (
    <section
      id="apply"
      aria-labelledby="careers-form-heading"
      className="bg-contact-form-band py-(--spacing-contact-form-band-y)"
    >
      <div className="mx-auto max-w-(--container-max-width) px-(--container-gutter-x)">
        <h2 id="careers-form-heading" className="sr-only">
          {careersCopy.form.heading}
        </h2>
        <CareersForm />
      </div>
    </section>
  );
}
