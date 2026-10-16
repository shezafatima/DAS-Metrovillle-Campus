"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ACCESSIBLE_SUBMIT_CLASS, BANNER_CLASS, ERROR_CLASS, INPUT_CLASS, SELECT_CLASS, TEXTAREA_CLASS } from "@/components/forms/public-form-styles";
import { registrationCopy } from "@/content/registration";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { MOTHER_TONGUES } from "@/lib/registration/rules";
import { fieldErrors as extractFieldErrors } from "@/lib/validation/field-errors";
import { buildRegistrationSchema, REGISTRATION_FIELD_ORDER, type RegistrationField } from "@/lib/validation/registration";
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
  emergencyName: "",
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

const LABEL_CLASS = "font-body text-(length:--text-signup-input) font-bold text-foreground";
const HINT_CLASS = "font-body text-xs text-foreground";
const LEGEND_CLASS = "font-heading text-h3 font-bold text-primary";

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
 */
export function RegistrationForm({ classes, today, retentionMonths }: Props) {
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Hidden spam-trap: stays empty for real visitors.
  const [website, setWebsite] = useState("");
  // Marks the form once React has taken it over, so browser tests do not type into it too early.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.setAttribute("data-ready", "true");
  }, []);

  const schema = useMemo(() => buildRegistrationSchema({ classes, today }), [classes, today]);
  const copy = registrationCopy;
  const submitting = status.kind === "submitting";

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

  function focusFirstInvalid(found: Record<string, string>) {
    const first = REGISTRATION_FIELD_ORDER.find((field) => field in found);
    if (!first) return;
    const target = document.getElementById(`registration-${first}`) ?? document.querySelector<HTMLElement>(`[name="${first}"]`);
    target?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const check = schema.safeParse({ ...values, consent });
    if (!check.success) {
      const found = extractFieldErrors(check.error);
      setErrors(found);
      setStatus({ kind: "idle" });
      focusFirstInvalid(found);
      return;
    }

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
        const found = (data.fields ?? {}) as Record<string, string>;
        setErrors(found);
        setStatus({ kind: "idle" });
        focusFirstInvalid(found);
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
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="w-full">
      {status.kind === "error" && (
        <p role="alert" className={`mb-(--spacing-registration-section-gap) ${BANNER_CLASS}`}>
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

      <div className="flex flex-col gap-(--spacing-registration-section-gap)">
        <Section legend={copy.legends.student}>
          <TextField {...field("studentName")} label={copy.labels.studentName} autoComplete="off" maxLength={100} dir="auto" required />
          <TextField {...field("dateOfBirth")} label={copy.labels.dateOfBirth} type="date" max={today} required />
          <SelectField {...field("className")} label={copy.labels.className} placeholder={copy.placeholders.className} required options={classes.map((name) => ({ value: name, label: name }))} />
        </Section>

        <Section legend={copy.legends.parents}>
          <TextField {...field("fatherName")} label={copy.labels.fatherName} autoComplete="off" maxLength={100} dir="auto" required />
          <TextField {...field("motherName")} label={copy.labels.motherName} autoComplete="off" maxLength={100} dir="auto" required />
          <TextField {...field("fatherMobile")} label={copy.labels.fatherMobile} type="tel" autoComplete="tel" maxLength={32} dir="ltr" hint={copy.hints.phone} />
          <TextField {...field("motherMobile")} label={copy.labels.motherMobile} type="tel" autoComplete="off" maxLength={32} dir="ltr" hint={copy.hints.parentMobile} />
        </Section>

        <Section legend={copy.legends.contact}>
          <TextField {...field("email")} label={copy.labels.email} type="email" autoComplete="email" maxLength={254} dir="ltr" required />
          <TextField {...field("emergencyName")} label={copy.labels.emergencyName} autoComplete="off" maxLength={100} dir="auto" required />
          <TextField {...field("emergencyPhone")} label={copy.labels.emergencyPhone} type="tel" autoComplete="off" maxLength={32} dir="ltr" hint={copy.hints.phone} required />
          <TextAreaField {...field("address")} label={copy.labels.address} maxLength={300} required wide />
        </Section>

        <Section legend={copy.legends.health}>
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

        <Section legend={copy.legends.reference} hint={copy.hints.referenceGroup}>
          <TextField {...field("referenceName")} label={copy.labels.referenceName} autoComplete="off" maxLength={100} dir="auto" />
          <TextField {...field("referenceClass")} label={copy.labels.referenceClass} autoComplete="off" maxLength={100} dir="auto" />
          <TextField {...field("referenceRelation")} label={copy.labels.referenceRelation} autoComplete="off" maxLength={100} dir="auto" />
        </Section>

        <Section legend={copy.legends.remarks}>
          <TextAreaField {...field("remarks")} label={copy.labels.remarks} maxLength={1000} wide />
        </Section>

        <div className="flex flex-col gap-2">
          <p id="registration-privacy-notice" data-placeholder={copy.privacy.placeholder || undefined} className="font-body text-sm text-foreground">
            {copy.privacy.notice(retentionMonths)}
          </p>
          <label htmlFor="registration-consent" className="flex items-start gap-3 font-body text-sm text-foreground">
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
              className="mt-1 accent-cta"
            />
            <span>{copy.privacy.consent}</span>
          </label>
          {errors.consent && (
            <p id="registration-consent-error" className={ERROR_CLASS}>
              {errors.consent}
            </p>
          )}
        </div>

        <button type="submit" disabled={submitting} className={ACCESSIBLE_SUBMIT_CLASS}>
          {submitting ? copy.sending : copy.submit}
        </button>
      </div>
    </form>
  );
}

function Section({ legend, hint, children }: { legend: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className={`mb-3 ${LEGEND_CLASS}`}>{legend}</legend>
      {hint && <p className={`mb-3 ${HINT_CLASS}`}>{hint}</p>}
      <div className="grid grid-cols-1 gap-x-(--spacing-contact-form-gap-x) gap-y-(--spacing-registration-field-gap-y) md:grid-cols-2">{children}</div>
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
    <div className={`flex flex-col gap-1 ${wide ? "md:col-span-2" : ""}`}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className={HINT_CLASS}>
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
  maxLength,
  max,
  dir,
  ...base
}: BaseProps & { type?: "text" | "email" | "tel" | "date"; autoComplete?: string; maxLength?: number; max?: string; dir?: "auto" | "ltr" }) {
  return (
    <Wrapper {...base}>
      <input
        id={base.id}
        name={base.name}
        type={type}
        dir={dir}
        autoComplete={autoComplete}
        maxLength={maxLength}
        max={max}
        value={base.value}
        onChange={(event) => base.onChange(event.target.value)}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(base.id, base.error, base.hint)}
        className={INPUT_CLASS}
      />
    </Wrapper>
  );
}

function TextAreaField({ maxLength, wide, ...base }: BaseProps & { maxLength: number; wide?: boolean }) {
  return (
    <Wrapper {...base} wide={wide}>
      <textarea
        id={base.id}
        name={base.name}
        dir="auto"
        maxLength={maxLength}
        value={base.value}
        onChange={(event) => base.onChange(event.target.value)}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(base.id, base.error, base.hint)}
        className={TEXTAREA_CLASS}
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
        className={SELECT_CLASS}
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
    <div className="flex flex-col gap-1">
      <span id={`${base.id}-label`} className={LABEL_CLASS}>
        {base.label} *
      </span>
      <div role="radiogroup" aria-labelledby={`${base.id}-label`} aria-invalid={base.error ? true : undefined} aria-describedby={base.error ? errorId : undefined} className="flex gap-6">
        {options.map((option, index) => (
          <label key={option.value} className="flex items-center gap-2 font-body text-sm text-foreground">
            <input
              id={index === 0 ? base.id : `${base.id}-${option.value}`}
              type="radio"
              name={base.name}
              value={option.value}
              checked={base.value === option.value}
              onChange={() => base.onChange(option.value)}
              className="accent-cta"
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
