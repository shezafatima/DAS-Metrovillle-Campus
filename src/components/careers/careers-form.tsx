"use client";

import { useState } from "react";
import { careersCopy } from "@/content/careers";
import { precheckCv, type CvFailure } from "@/lib/careers/cv-limits";
import { careerApplicationFieldsSchema } from "@/lib/validation/career-application";
import { fieldErrors as extractFieldErrors } from "@/lib/validation/field-errors";
import { HONEYPOT_FIELD } from "@/lib/honeypot";

interface FormValues {
  name: string;
  email: string;
  phone: string;
  qualification: string;
}

type Status = { kind: "idle" } | { kind: "submitting" } | { kind: "success" } | { kind: "error"; banner: string };

const EMPTY_VALUES: FormValues = { name: "", email: "", phone: "", qualification: "" };
const FIELD_ORDER = ["name", "email", "phone", "qualification", "cv", "consent"] as const;

const CV_MESSAGES: Record<CvFailure, string> = {
  empty: careersCopy.fieldErrors.cv.empty,
  too_large: careersCopy.fieldErrors.cv.tooLarge,
  not_pdf: careersCopy.fieldErrors.cv.notPdf,
};

const INPUT_CLASS =
  "h-(--spacing-signup-input-height) w-full rounded-signup-input border border-signup-input-border bg-signup-input-bg px-4 font-body text-(length:--text-signup-input) text-foreground outline-none placeholder:text-signup-input-text focus-visible:ring-2 focus-visible:ring-ring";
const ERROR_CLASS = "rounded-signup-input bg-signup-input-bg px-2 py-1 text-left font-body text-xs font-bold text-error";

/**
 * The application form (contracts/careers-page.md, public-careers-api.md).
 * Client-side validation runs the same shared schema and the CV pre-check
 * the server repeats (Constitution VI). The request carries the raw typed
 * values; the server normalises and stores. The chosen `File` lives in
 * component state, so every failure keeps the typed details AND the file
 * and a retry resends it without re-attaching.
 */
export function CareersForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Hidden spam-trap: stays empty for real visitors.
  const [website, setWebsite] = useState("");

  const submitting = status.kind === "submitting";
  const copy = careersCopy.form;

  function clearError(field: string) {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function updateField(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  }

  function focusFirstInvalid(errors: Record<string, string>) {
    const first = FIELD_ORDER.find((field) => field in errors);
    if (first) document.getElementById(`careers-${first}`)?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const check = careerApplicationFieldsSchema.safeParse({ ...values, consent });
    const errors: Record<string, string> = check.success ? {} : extractFieldErrors(check.error);
    if (!file) {
      errors.cv = careersCopy.fieldErrors.cv.missing;
    } else {
      const failure = await precheckCv(file);
      if (failure) errors.cv = CV_MESSAGES[failure];
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstInvalid(errors);
      return;
    }

    setFieldErrors({});
    setStatus({ kind: "submitting" });

    const body = new FormData();
    body.set("name", values.name);
    body.set("email", values.email);
    body.set("phone", values.phone);
    body.set("qualification", values.qualification);
    body.set("consent", "true");
    body.set(HONEYPOT_FIELD, website);
    body.set("cv", file as File);

    try {
      const response = await fetch("/api/public/careers", { method: "POST", body });

      if (response.status === 200) {
        setValues(EMPTY_VALUES);
        setFile(null);
        setConsent(false);
        setStatus({ kind: "success" });
        return;
      }

      if (response.status === 400) {
        const data = await response.json().catch(() => ({}));
        const errors = (data.fields ?? {}) as Record<string, string>;
        setFieldErrors(errors);
        setStatus({ kind: "idle" });
        focusFirstInvalid(errors);
        return;
      }

      if (response.status === 409) {
        const data = await response.json().catch(() => ({}));
        setStatus({ kind: "error", banner: careersCopy.errors.alreadyApplied(String(data.reapplyFrom ?? "")) });
        return;
      }

      if (response.status === 413) {
        setFieldErrors({ cv: careersCopy.fieldErrors.cv.tooLarge });
        setStatus({ kind: "idle" });
        return;
      }

      if (response.status === 429) {
        setStatus({ kind: "error", banner: careersCopy.errors.rateLimited });
        return;
      }

      setStatus({ kind: "error", banner: careersCopy.errors.tryAgain });
    } catch {
      setStatus({ kind: "error", banner: careersCopy.errors.tryAgain });
    }
  }

  if (status.kind === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 text-center">
        <p className="font-heading text-h3 font-bold text-foreground">{careersCopy.success.title}</p>
        <p className="font-body text-body text-foreground">{careersCopy.success.body}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      {status.kind === "error" && (
        <p role="alert" className="mb-(--spacing-contact-form-gap-y) rounded-md bg-white px-3 py-2 text-center font-body text-sm font-bold text-error">
          {status.banner}
        </p>
      )}

      <div aria-hidden="true" className="signup-honeypot">
        <label htmlFor="careers-website">Website</label>
        <input
          id="careers-website"
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-x-(--spacing-contact-form-gap-x) gap-y-(--spacing-contact-form-gap-y) md:grid-cols-2">
        <Field
          id="careers-name"
          label={copy.placeholders.name}
          type="text"
          autoComplete="name"
          maxLength={100}
          value={values.name}
          error={fieldErrors.name}
          onChange={(value) => updateField("name", value)}
        />
        <Field
          id="careers-email"
          label={copy.placeholders.email}
          type="email"
          autoComplete="email"
          maxLength={254}
          value={values.email}
          error={fieldErrors.email}
          onChange={(value) => updateField("email", value)}
        />
        <Field
          id="careers-phone"
          label={copy.placeholders.phone}
          type="tel"
          autoComplete="tel"
          maxLength={32}
          value={values.phone}
          error={fieldErrors.phone}
          onChange={(value) => updateField("phone", value)}
        />
        <Field
          id="careers-qualification"
          label={copy.placeholders.qualification}
          type="text"
          autoComplete="off"
          maxLength={150}
          value={values.qualification}
          error={fieldErrors.qualification}
          onChange={(value) => updateField("qualification", value)}
        />

        <div className="flex flex-col gap-1 md:col-span-2">
          <input
            id="careers-cv"
            name="cv"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="peer sr-only"
            aria-invalid={fieldErrors.cv ? true : undefined}
            aria-describedby={fieldErrors.cv ? "careers-cv-error" : undefined}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              clearError("cv");
            }}
          />
          <label
            htmlFor="careers-cv"
            className={`flex h-(--spacing-signup-input-height) w-full cursor-pointer items-center rounded-signup-input border border-signup-input-border bg-signup-input-bg px-4 font-body text-(length:--text-signup-input) peer-focus-visible:ring-2 peer-focus-visible:ring-ring ${file ? "text-foreground" : "text-signup-input-text"}`}
          >
            <span dir="auto" className="truncate">
              {file ? copy.cvChosen(file.name) : copy.cvLabel}
            </span>
          </label>
          {fieldErrors.cv && (
            <p id="careers-cv-error" className={ERROR_CLASS}>
              {fieldErrors.cv}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <p id="careers-privacy-notice" data-placeholder={careersCopy.privacy.placeholder || undefined} className="font-body text-sm text-foreground">
            {careersCopy.privacy.notice}
          </p>
          <label htmlFor="careers-consent" className="flex items-start gap-3 font-body text-sm text-foreground">
            <input
              id="careers-consent"
              name="consent"
              type="checkbox"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                clearError("consent");
              }}
              aria-invalid={fieldErrors.consent ? true : undefined}
              aria-describedby={fieldErrors.consent ? "careers-consent-error careers-privacy-notice" : "careers-privacy-notice"}
              className="mt-1 accent-cta"
            />
            <span>{careersCopy.privacy.consentLabel}</span>
          </label>
          {fieldErrors.consent && (
            <p id="careers-consent-error" className={ERROR_CLASS}>
              {fieldErrors.consent}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-signup-button bg-cta px-6 py-3 font-button text-(length:--text-button) font-semibold text-white transition-colors duration-(--motion-fast) hover:bg-cta-hover disabled:opacity-70 md:col-span-2"
        >
          {submitting ? copy.sending : copy.submit}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  type: "text" | "email" | "tel";
  autoComplete: string;
  maxLength: number;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
}

function Field({ id, label, type, autoComplete, maxLength, value, error, onChange }: FieldProps) {
  const errorId = `${id}-error`;
  // Names and qualifications may be Urdu (right-to-left); email and phone are always left-to-right.
  const dir = type === "text" ? "auto" : "ltr";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        name={id.replace("careers-", "")}
        type={type}
        dir={dir}
        autoComplete={autoComplete}
        required
        maxLength={maxLength}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={INPUT_CLASS}
      />
      {error && (
        <p id={errorId} className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}
