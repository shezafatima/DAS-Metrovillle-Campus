"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, GraduationCap, HeartPulse, MapPin, MessageSquare, Phone, Mail, ShieldCheck, UserCheck, Users, type LucideIcon } from "lucide-react";
import { ErrorSummary, type ErrorSummaryItem } from "@/components/forms/error-summary";
import { IconInput } from "@/components/forms/icon-input";
import {
  BANNER_CLASS,
  ERROR_CLASS,
  FORM_CHOICE_INPUT_CLASS,
  FORM_CHOICE_LABEL_CLASS,
  FORM_HINT_CLASS,
  FORM_INPUT_CLASS,
  FORM_INPUT_ICON_CLASS,
  FORM_LABEL_CLASS,
  FORM_SELECT_CLASS,
  FORM_TEXTAREA_CLASS,
  FORM_TEXTAREA_COMPACT_CLASS,
} from "@/components/forms/public-form-styles";
import { SubmitButton } from "@/components/forms/submit-button";
import { registrationCopy } from "@/content/registration";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { MOTHER_TONGUES } from "@/lib/registration/rules";
import { fieldErrors as extractFieldErrors } from "@/lib/validation/field-errors";
import { buildRegistrationSchema, REGISTRATION_FIELD_ORDER, type RegistrationField } from "@/lib/validation/registration";
import { ProgressBar, ProgressList, useCurrentSection, useInView, type ProgressSection } from "./registration-progress";
import { RegistrationConfirmation } from "./registration-confirmation";

type Values = Record<Exclude<RegistrationField, "consent">, string>;

type Status = { kind: "idle" } | { kind: "submitting" } | { kind: "success"; reference: string } | { kind: "error"; banner: string };

const EMPTY_VALUES: Values = {
  studentName: "",
  dateOfBirth: "",
  className: "",
  fatherName: "",
  motherName: "",
  fatherMobile: "",
  motherMobile: "",
  email: "",
  address: "",
  emergencyPhone: "",
  vaccinated: "",
  medicalHistory: "",
  motherTongue: "",
  motherTongueOther: "",
  referenceName: "",
  referenceClass: "",
  referenceRelation: "",
  remarks: "",
};

/**
 * The six sections, in page order. `fields` are the request keys that belong to a section: a required section is
 * done when none of them has a problem; an optional one is done only once something in it is filled in and valid.
 */
const SECTIONS: { key: keyof typeof registrationCopy.legends; icon: LucideIcon; fields: (keyof Values)[]; optional: boolean }[] = [
  { key: "student", icon: GraduationCap, fields: ["studentName", "dateOfBirth", "className"], optional: false },
  { key: "parents", icon: Users, fields: ["fatherName", "motherName", "fatherMobile", "motherMobile"], optional: false },
  { key: "contact", icon: MapPin, fields: ["email", "emergencyPhone", "address"], optional: false },
  { key: "health", icon: HeartPulse, fields: ["vaccinated", "motherTongue", "motherTongueOther", "medicalHistory"], optional: false },
  { key: "reference", icon: UserCheck, fields: ["referenceName", "referenceClass", "referenceRelation"], optional: true },
  { key: "remarks", icon: MessageSquare, fields: ["remarks"], optional: true },
];

const sectionId = (key: string) => `registration-section-${key}`;

interface Props {
  classes: string[];
  /** The Pakistan calendar day, "YYYY-MM-DD" (the server's answer when the page rendered). */
  today: string;
  retentionMonths: number;
}

/**
 * The registration form (contracts/registration-page.md). Client validation
 * runs the same schema factory the route rebuilds from fresh Settings, so
 * the messages match; the server stays authoritative. Every failure keeps all
 * typed values; only a 200 clears them.
 *
 * 026: the six fieldsets are numbered cards, with a progress list beside them (1024px and up) or a slim bar under
 * the header (below), and an error summary after a failed submit. Fields, order, labels, validation and the
 * request are unchanged.
 */
export function RegistrationForm({ classes, today, retentionMonths }: Props) {
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Bumped on every failed submit: moves focus to the error summary.
  const [summarySignal, setSummarySignal] = useState(0);
  // Hidden spam-trap: stays empty for real visitors.
  const [website, setWebsite] = useState("");
  // Set the instant a send starts, so a second click before the button re-renders as disabled cannot send twice.
  const inFlight = useRef(false);
  // Marks the form once React has taken it over, so browser tests do not type into it too early.
  const formRef = useRef<HTMLFormElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    formRef.current?.setAttribute("data-ready", "true");
  }, []);

  const schema = useMemo(() => buildRegistrationSchema({ classes, today }), [classes, today]);
  const copy = registrationCopy;
  const submitting = status.kind === "submitting";

  // The problems the visitor has not been shown: the same schema run silently, to decide which sections are done.
  const silentProblems = useMemo(() => {
    const check = schema.safeParse({ ...values, consent: true });
    return check.success ? {} : extractFieldErrors(check.error);
  }, [schema, values]);

  const progress: ProgressSection[] = SECTIONS.map((section) => {
    const clean = section.fields.every((key) => !(key in silentProblems));
    const filled = section.fields.some((key) => values[key].trim() !== "");
    return { id: sectionId(section.key), title: copy.legends[section.key], optional: section.optional, done: section.optional ? filled && clean : clean };
  });
  const current = useCurrentSection(progress.map((section) => section.id));
  const barVisible = useInView(rootRef);

  const summaryItems: ErrorSummaryItem[] = [...REGISTRATION_FIELD_ORDER]
    .filter((key) => key in errors)
    .map((key) => ({ field: key, targetId: `registration-${key}`, message: errors[key] }));

  function clearError(field: string) {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function update(field: keyof Values, value: string) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      // The Other text only means something while Other is chosen.
      if (field === "motherTongue" && value !== "other") next.motherTongueOther = "";
      return next;
    });
    clearError(field);
    if (field === "fatherMobile" || field === "motherMobile") {
      clearError("fatherMobile");
      clearError("motherMobile");
    }
    if (field.startsWith("reference")) {
      clearError("referenceName");
      clearError("referenceClass");
      clearError("referenceRelation");
    }
  }

  function showProblems(found: Record<string, string>) {
    setErrors(found);
    setStatus({ kind: "idle" });
    setSummarySignal((count) => count + 1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const check = schema.safeParse({ ...values, consent });
    if (!check.success) {
      showProblems(extractFieldErrors(check.error));
      return;
    }

    inFlight.current = true;
    setErrors({});
    setStatus({ kind: "submitting" });

    try {
      const response = await fetch("/api/public/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, consent: true, [HONEYPOT_FIELD]: website }),
      });

      if (response.status === 200) {
        const data = await response.json().catch(() => ({}));
        setValues(EMPTY_VALUES);
        setConsent(false);
        setStatus({ kind: "success", reference: String(data.reference ?? "") });
        return;
      }

      if (response.status === 400) {
        const data = await response.json().catch(() => ({}));
        showProblems((data.fields ?? {}) as Record<string, string>);
        return;
      }

      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        setStatus({ kind: "error", banner: typeof data.message === "string" && data.message ? data.message : copy.banners.closed });
        return;
      }

      if (response.status === 429) {
        setStatus({ kind: "error", banner: copy.banners.rateLimited });
        return;
      }

      setStatus({ kind: "error", banner: copy.banners.unavailable });
    } catch {
      setStatus({ kind: "error", banner: copy.banners.unavailable });
    } finally {
      inFlight.current = false;
    }
  }

  if (status.kind === "success") return <RegistrationConfirmation reference={status.reference} />;

  const field = (key: keyof Values) => ({
    id: `registration-${key}`,
    name: key,
    value: values[key],
    error: errors[key],
    onChange: (value: string) => update(key, value),
  });

  return (
    <div ref={rootRef} className="registration-root lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
      <ProgressList sections={progress} current={current} />
      <ProgressBar sections={progress} current={current} visible={barVisible} />

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="w-full min-w-0">
        <div className="flex flex-col gap-(--spacing-registration-section-gap)">
          <ErrorSummary items={summaryItems} focusSignal={summarySignal} />

          {status.kind === "error" && (
            <p role="alert" className={BANNER_CLASS}>
              {status.banner}
            </p>
          )}

          <div aria-hidden="true" className="signup-honeypot">
            <label htmlFor="registration-website">Website</label>
            <input
              id="registration-website"
              name={HONEYPOT_FIELD}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>

          <div className="registration-sections flex flex-col gap-(--spacing-registration-section-gap)">
            <Section section={SECTIONS[0]}>
              <TextField {...field("studentName")} label={copy.labels.studentName} autoComplete="off" maxLength={100} dir="auto" required />
              <TextField {...field("dateOfBirth")} label={copy.labels.dateOfBirth} type="date" autoComplete="off" max={today} icon={Calendar} required />
              <SelectField {...field("className")} label={copy.labels.className} placeholder={copy.placeholders.className} required options={classes.map((name) => ({ value: name, label: name }))} />
            </Section>

            <Section section={SECTIONS[1]}>
              <TextField {...field("fatherName")} label={copy.labels.fatherName} autoComplete="off" maxLength={100} dir="auto" required />
              <TextField {...field("motherName")} label={copy.labels.motherName} autoComplete="off" maxLength={100} dir="auto" required />
              <TextField {...field("fatherMobile")} label={copy.labels.fatherMobile} type="tel" inputMode="tel" autoComplete="tel" maxLength={32} dir="ltr" hint={copy.hints.phone} icon={Phone} />
              <TextField {...field("motherMobile")} label={copy.labels.motherMobile} type="tel" inputMode="tel" autoComplete="off" maxLength={32} dir="ltr" hint={copy.hints.parentMobile} icon={Phone} />
            </Section>

            <Section section={SECTIONS[2]}>
              <TextField {...field("email")} label={copy.labels.email} type="email" inputMode="email" autoComplete="email" maxLength={254} dir="ltr" icon={Mail} required />
              <TextField {...field("emergencyPhone")} label={copy.labels.emergencyPhone} type="tel" inputMode="tel" autoComplete="off" maxLength={32} dir="ltr" hint={copy.hints.phone} icon={Phone} required />
              <TextAreaField {...field("address")} label={copy.labels.address} maxLength={300} autoComplete="street-address" required wide compact />
            </Section>

            <Section section={SECTIONS[3]}>
              <RadioField
                id="registration-vaccinated"
                name="vaccinated"
                label={copy.labels.vaccinated}
                value={values.vaccinated}
                error={errors.vaccinated}
                onChange={(value) => update("vaccinated", value)}
                options={[
                  { value: "yes", label: copy.labels.yes },
                  { value: "no", label: copy.labels.no },
                ]}
              />
              <SelectField
                {...field("motherTongue")}
                label={copy.labels.motherTongue}
                placeholder={copy.placeholders.motherTongue}
                required
                options={MOTHER_TONGUES.map((value) => ({ value, label: copy.motherTongueOptions[value] }))}
              />
              {values.motherTongue === "other" && (
                <TextField {...field("motherTongueOther")} label={copy.labels.motherTongueOther} autoComplete="off" maxLength={50} dir="auto" required />
              )}
              <TextAreaField {...field("medicalHistory")} label={copy.labels.medicalHistory} maxLength={1000} hint={copy.hints.medicalHistory} wide />
            </Section>

            <Section section={SECTIONS[4]} hint={copy.hints.referenceGroup}>
              <TextField {...field("referenceName")} label={copy.labels.referenceName} autoComplete="off" maxLength={100} dir="auto" />
              <TextField {...field("referenceClass")} label={copy.labels.referenceClass} autoComplete="off" maxLength={100} dir="auto" />
              <TextField {...field("referenceRelation")} label={copy.labels.referenceRelation} autoComplete="off" maxLength={100} dir="auto" />
            </Section>

            <Section section={SECTIONS[5]}>
              <TextAreaField {...field("remarks")} label={copy.labels.remarks} maxLength={1000} wide />
            </Section>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-neutral-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden="true" focusable="false" className="mt-0.5 size-6 shrink-0 text-primary" />
              <p id="registration-privacy-notice" data-placeholder={copy.privacy.placeholder || undefined} className="font-body text-sm text-foreground">
                {copy.privacy.notice(retentionMonths)}
              </p>
            </div>
            <label htmlFor="registration-consent" className={FORM_CHOICE_LABEL_CLASS}>
              <input
                id="registration-consent"
                name="consent"
                type="checkbox"
                checked={consent}
                onChange={(event) => {
                  setConsent(event.target.checked);
                  clearError("consent");
                }}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? "registration-consent-error registration-privacy-notice" : "registration-privacy-notice"}
                className={`${FORM_CHOICE_INPUT_CLASS} scroll-mt-(--form-scroll-offset)`}
              />
              <span>{copy.privacy.consent}</span>
            </label>
            {errors.consent && (
              <p id="registration-consent-error" className={ERROR_CLASS}>
                {errors.consent}
              </p>
            )}
          </div>

          <SubmitButton submitting={submitting} label={copy.submit} submittingLabel={copy.sending} />
        </div>
      </form>
    </div>
  );
}

/** One numbered card. The legend is the header; its number is drawn by CSS and its icon is decorative, so the legend's text is only the title. */
function Section({ section, hint, children }: { section: (typeof SECTIONS)[number]; hint?: string; children: React.ReactNode }) {
  const Icon = section.icon;
  return (
    <fieldset id={sectionId(section.key)} className="min-w-0 scroll-mt-(--form-scroll-offset) overflow-hidden rounded-xl border border-neutral-100 bg-white p-0 shadow-sm">
      <legend className="float-left flex w-full items-center gap-3 bg-primary/10 px-5 py-4 font-bold font-heading text-h3 text-primary">
        <span aria-hidden="true" className="registration-badge flex size-8 shrink-0 items-center justify-center rounded-full bg-gold font-body font-bold text-base text-primary" />
        <Icon aria-hidden="true" focusable="false" className="size-6 shrink-0" />
        {registrationCopy.legends[section.key]}
      </legend>
      <div className="clear-both p-5">
        {hint && <p className={`mb-4 ${FORM_HINT_CLASS}`}>{hint}</p>}
        <div className="grid grid-cols-1 gap-x-(--spacing-contact-form-gap-x) gap-y-(--spacing-registration-field-gap-y) md:grid-cols-2">{children}</div>
      </div>
    </fieldset>
  );
}

interface BaseProps {
  id: string;
  name: string;
  label: string;
  value: string;
  error: string | undefined;
  hint?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

function describedBy(id: string, error: string | undefined, hint: string | undefined): string | undefined {
  const ids = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function Wrapper({ id, label, error, hint, required, wide, children }: Pick<BaseProps, "id" | "label" | "error" | "hint" | "required"> & { wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <label htmlFor={id} className={FORM_LABEL_CLASS}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className={FORM_HINT_CLASS}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}

function TextField({
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  max,
  dir,
  icon,
  ...base
}: BaseProps & {
  type?: "text" | "email" | "tel" | "date";
  autoComplete?: string;
  inputMode?: "tel" | "email";
  maxLength?: number;
  max?: string;
  dir?: "auto" | "ltr";
  icon?: LucideIcon;
}) {
  const input = (
    <input
      id={base.id}
      name={base.name}
      type={type}
      dir={dir}
      autoComplete={autoComplete}
      inputMode={inputMode}
      maxLength={maxLength}
      max={max}
      value={base.value}
      onChange={(event) => base.onChange(event.target.value)}
      aria-invalid={base.error ? true : undefined}
      aria-describedby={describedBy(base.id, base.error, base.hint)}
      className={icon ? FORM_INPUT_ICON_CLASS : FORM_INPUT_CLASS}
    />
  );
  return <Wrapper {...base}>{icon ? <IconInput icon={icon}>{input}</IconInput> : input}</Wrapper>;
}

function TextAreaField({
  maxLength,
  wide,
  compact,
  autoComplete,
  ...base
}: BaseProps & { maxLength: number; wide?: boolean; compact?: boolean; autoComplete?: string }) {
  return (
    <Wrapper {...base} wide={wide}>
      <textarea
        id={base.id}
        name={base.name}
        dir="auto"
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={base.value}
        onChange={(event) => base.onChange(event.target.value)}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(base.id, base.error, base.hint)}
        className={compact ? FORM_TEXTAREA_COMPACT_CLASS : FORM_TEXTAREA_CLASS}
      />
    </Wrapper>
  );
}

function SelectField({ options, placeholder, ...base }: BaseProps & { options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <Wrapper {...base}>
      <select
        id={base.id}
        name={base.name}
        value={base.value}
        onChange={(event) => base.onChange(event.target.value)}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(base.id, base.error, base.hint)}
        className={FORM_SELECT_CLASS}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

function RadioField({ options, ...base }: BaseProps & { options: { value: string; label: string }[] }) {
  const errorId = `${base.id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${base.id}-label`} className={FORM_LABEL_CLASS}>
        {base.label} *
      </span>
      <div role="radiogroup" aria-labelledby={`${base.id}-label`} aria-invalid={base.error ? true : undefined} aria-describedby={base.error ? errorId : undefined} className="flex gap-6">
        {options.map((option, index) => (
          <label key={option.value} className={FORM_CHOICE_LABEL_CLASS}>
            <input
              id={index === 0 ? base.id : `${base.id}-${option.value}`}
              type="radio"
              name={base.name}
              value={option.value}
              checked={base.value === option.value}
              onChange={() => base.onChange(option.value)}
              className={`${FORM_CHOICE_INPUT_CLASS} scroll-mt-(--form-scroll-offset)`}
            />
            {option.label}
          </label>
        ))}
      </div>
      {base.error && (
        <p id={errorId} className={ERROR_CLASS}>
          {base.error}
        </p>
      )}
    </div>
  );
}
