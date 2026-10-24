"use client";

import { useRef, useState } from "react";
import { Mail, Phone, type LucideIcon } from "lucide-react";
import { careersCopy } from "@/content/careers";
import { precheckCv, type CvFailure } from "@/lib/careers/cv-limits";
import { careerApplicationFieldsSchema } from "@/lib/validation/career-application";
import { fieldErrors as extractFieldErrors } from "@/lib/validation/field-errors";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { ErrorSummary, type ErrorSummaryItem } from "@/components/forms/error-summary";
import { FileDropZone } from "@/components/forms/file-drop-zone";
import { IconInput } from "@/components/forms/icon-input";
import {
  BANNER_CLASS,
  ERROR_CLASS,
  FORM_CHOICE_INPUT_CLASS,
  FORM_CHOICE_LABEL_CLASS,
  FORM_INPUT_CLASS,
  FORM_INPUT_ICON_CLASS,
  FORM_LABEL_CLASS,
} from "@/components/forms/public-form-styles";
import { SubmitButton } from "@/components/forms/submit-button";

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


/**
 * The application form (contracts/careers-page.md, public-careers-api.md).
 * Client-side validation runs the same shared schema and the CV pre-check
 * the server repeats (Constitution VI). The request carries the raw typed
 * values; the server normalises and stores. The chosen `File` lives in
 * component state, so every failure keeps the typed details AND the file
 * and a retry resends it without re-attaching.
 *
 * 026: visible labels above the fields, icons on the email and mobile fields, a CV drop zone, an error summary
 * after a failed submit, and a submit button that cannot be sent twice. Fields, validation and the request are
 * unchanged.
 */
export function CareersForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Bumped on every failed submit: moves focus to the error summary.
  const [summarySignal, setSummarySignal] = useState(0);
  // Hidden spam-trap: stays empty for real visitors.
  const [website, setWebsite] = useState("");
  // Set the instant a send starts, so a second click before the button re-renders as disabled cannot send twice.
  const inFlight = useRef(false);

  const submitting = status.kind === "submitting";
  const copy = careersCopy.form;

  const summaryItems: ErrorSummaryItem[] = FIELD_ORDER.filter((key) => key in fieldErrors).map((key) => ({
    field: key,
    targetId: `careers-${key}`,
    message: fieldErrors[key],
  }));

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

  function showProblems(errors: Record<string, string>) {
    setFieldErrors(errors);
    setStatus({ kind: "idle" });
    setSummarySignal((count) => count + 1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    // Taken before the CV pre-check (which awaits), so a second click during it cannot start a second send.
    inFlight.current = true;

    try {
      const check = careerApplicationFieldsSchema.safeParse({ ...values, consent });
      const errors: Record<string, string> = check.success ? {} : extractFieldErrors(check.error);
      if (!file) {
        errors.cv = careersCopy.fieldErrors.cv.missing;
      } else {
        const failure = await precheckCv(file);
        if (failure) errors.cv = CV_MESSAGES[failure];
      }
      if (Object.keys(errors).length > 0) {
        showProblems(errors);
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
        showProblems((data.fields ?? {}) as Record<string, string>);
        return;
      }

      if (response.status === 409) {
        const data = await response.json().catch(() => ({}));
        setStatus({ kind: "error", banner: careersCopy.errors.alreadyApplied(String(data.reapplyFrom ?? "")) });
        return;
      }

      if (response.status === 413) {
        showProblems({ cv: careersCopy.fieldErrors.cv.tooLarge });
        return;
      }

      if (response.status === 429) {
        setStatus({ kind: "error", banner: careersCopy.errors.rateLimited });
        return;
      }

      setStatus({ kind: "error", banner: careersCopy.errors.tryAgain });
    } catch {
      setStatus({ kind: "error", banner: careersCopy.errors.tryAgain });
    } finally {
      inFlight.current = false;
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
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
      <ErrorSummary items={summaryItems} focusSignal={summarySignal} />

      {status.kind === "error" && (
        <p role="alert" className={BANNER_CLASS}>
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

      <div className="grid grid-cols-1 gap-x-6 gap-y-(--spacing-registration-field-gap-y) md:grid-cols-2 lg:grid-cols-1">
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
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          icon={Mail}
          value={values.email}
          error={fieldErrors.email}
          onChange={(value) => updateField("email", value)}
        />
        <Field
          id="careers-phone"
          label={copy.placeholders.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={32}
          icon={Phone}
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

        <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-1">
          <FileDropZone
            id="careers-cv"
            name="cv"
            accept="application/pdf,.pdf"
            file={file}
            onFile={(chosen) => {
              setFile(chosen);
              clearError("cv");
            }}
            error={fieldErrors.cv}
            labels={copy.cv}
          />
          {fieldErrors.cv && (
            <p id="careers-cv-error" className={ERROR_CLASS}>
              {fieldErrors.cv}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p id="careers-privacy-notice" data-placeholder={careersCopy.privacy.placeholder || undefined} className="font-body text-sm text-foreground">
          {careersCopy.privacy.notice}
        </p>
        <label htmlFor="careers-consent" className={FORM_CHOICE_LABEL_CLASS}>
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
            className={`${FORM_CHOICE_INPUT_CLASS} scroll-mt-(--form-scroll-offset)`}
          />
          <span>{careersCopy.privacy.consentLabel}</span>
        </label>
        {fieldErrors.consent && (
          <p id="careers-consent-error" className={ERROR_CLASS}>
            {fieldErrors.consent}
          </p>
        )}
      </div>

      <SubmitButton submitting={submitting} label={copy.submit} submittingLabel={copy.sending} />
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  type: "text" | "email" | "tel";
  inputMode?: "email" | "tel";
  autoComplete: string;
  maxLength: number;
  icon?: LucideIcon;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
}

function Field({ id, label, type, inputMode, autoComplete, maxLength, icon, value, error, onChange }: FieldProps) {
  const errorId = `${id}-error`;
  // Names and qualifications may be Urdu (right-to-left); email and phone are always left-to-right.
  const dir = type === "text" ? "auto" : "ltr";

  const input = (
    <input
      id={id}
      name={id.replace("careers-", "")}
      type={type}
      inputMode={inputMode}
      dir={dir}
      autoComplete={autoComplete}
      required
      maxLength={maxLength}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      className={icon ? FORM_INPUT_ICON_CLASS : FORM_INPUT_CLASS}
    />
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={FORM_LABEL_CLASS}>
        {label}
      </label>
      {icon ? <IconInput icon={icon}>{input}</IconInput> : input}
      {error && (
        <p id={errorId} className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}
