"use client";

import { useId, useState } from "react";
import { signupCopy } from "@/content/signup";
import { signupInputSchema, fieldErrors as extractFieldErrors } from "@/lib/validation/signup";
import type { SignupSource } from "@/lib/signup/sources";

type FieldName = "name" | "email" | "phone";

interface FormValues {
  name: string;
  email: string;
  phone: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; banner: string };

const EMPTY_VALUES: FormValues = { name: "", email: "", phone: "" };

export interface SignupFormProps {
  source: SignupSource;
}

/**
 * The signup form itself (FR-001–FR-011). Client-side validation runs
 * the same shared schema the server uses (Constitution IV), but the
 * request body always carries the visitor's raw typed values, not the
 * schema's normalised output — the server is the single place that
 * normalises and stores (contracts/public-signup-api.md; ADR-0001's
 * identity rule depends on the server doing this once, consistently).
 */
export function SignupForm({ source }: SignupFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const formId = useId();

  const submitting = status.kind === "submitting";

  function updateField(field: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear that field's message as soon as the visitor starts
    // correcting it (FR-007) — never wait for the next full submit.
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function resetForSomeoneElse() {
    setValues(EMPTY_VALUES);
    setFieldErrors({});
    setStatus({ kind: "idle" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const check = signupInputSchema.safeParse({ ...values, source });
    if (!check.success) {
      setFieldErrors(extractFieldErrors(check.error));
      return;
    }

    setFieldErrors({});
    setStatus({ kind: "submitting" });

    try {
      const response = await fetch("/api/public/signups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, source, website_url: "" }),
      });

      if (response.status === 200) {
        setStatus({ kind: "success" });
        return;
      }

      if (response.status === 400) {
        const body = await response.json();
        setFieldErrors(body.fields ?? {});
        setStatus({ kind: "idle" });
        return;
      }

      if (response.status === 429) {
        setStatus({ kind: "error", banner: signupCopy.errors.rateLimited });
        return;
      }

      setStatus({ kind: "error", banner: signupCopy.errors.unavailable });
    } catch {
      setStatus({ kind: "error", banner: signupCopy.errors.unavailable });
    }
  }

  if (status.kind === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 text-center text-white">
        <p className="font-heading text-h3 font-bold">{signupCopy.success.title}</p>
        <p className="font-body text-body">{signupCopy.success.body}</p>
        <button
          type="button"
          onClick={resetForSomeoneElse}
          className="font-body text-body text-signup-highlight underline underline-offset-4"
        >
          {signupCopy.success.again}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      {status.kind === "error" && (
        <p
          role="alert"
          className="mb-(--spacing-signup-gap) rounded-signup-input bg-signup-input-bg px-3 py-2 text-center text-sm font-bold text-error"
        >
          {status.banner}
        </p>
      )}

      <div className="grid grid-cols-1 gap-(--spacing-signup-gap) md:grid-cols-3 lg:grid-cols-4">
        <Field
          formId={formId}
          field="name"
          label={signupCopy.fields.name}
          type="text"
          autoComplete="name"
          maxLength={100}
          value={values.name}
          error={fieldErrors.name}
          onChange={(value) => updateField("name", value)}
        />
        <Field
          formId={formId}
          field="email"
          label={signupCopy.fields.email}
          type="email"
          autoComplete="email"
          maxLength={254}
          value={values.email}
          error={fieldErrors.email}
          onChange={(value) => updateField("email", value)}
        />
        <Field
          formId={formId}
          field="phone"
          label={signupCopy.fields.phone}
          type="tel"
          autoComplete="tel"
          maxLength={20}
          value={values.phone}
          error={fieldErrors.phone}
          onChange={(value) => updateField("phone", value)}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-signup-button bg-cta px-(--spacing-signup-gap) py-3 font-button text-(length:--text-button) font-semibold text-white transition-colors duration-(--motion-fast) hover:bg-cta-hover disabled:opacity-70 md:col-span-3 lg:col-span-1"
        >
          {submitting ? signupCopy.submitting : signupCopy.submit}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  formId: string;
  field: FieldName;
  label: string;
  type: "text" | "email" | "tel";
  autoComplete: string;
  maxLength: number;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
}

function Field({ formId, field, label, type, autoComplete, maxLength, value, error, onChange }: FieldProps) {
  const inputId = `${formId}-${field}`;
  const errorId = `${formId}-${field}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        name={field}
        type={type}
        autoComplete={autoComplete}
        required
        maxLength={maxLength}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-(--spacing-signup-input-height) w-full rounded-signup-input border border-signup-input-border bg-signup-input-bg px-4 font-body text-(length:--text-signup-input) text-signup-input-text outline-none placeholder:text-signup-input-text focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error && (
        <p
          id={errorId}
          className="rounded-signup-input bg-signup-input-bg px-2 py-1 text-left text-xs font-bold text-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
