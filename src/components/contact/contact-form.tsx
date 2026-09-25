"use client";

import { useState } from "react";
import { contactCopy } from "@/content/contact";
import { messageInputSchema, MESSAGE_MAX_LENGTH } from "@/lib/validation/message";
import { fieldErrors as extractFieldErrors } from "@/lib/validation/field-errors";
import { HONEYPOT_FIELD } from "@/lib/honeypot";

interface FormValues {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

type Status = { kind: "idle" } | { kind: "submitting" } | { kind: "success" } | { kind: "error"; banner: string };

const EMPTY_VALUES: FormValues = { name: "", email: "", phone: "", subject: "", message: "" };

/**
 * The contact form itself (public-contact-api.md "Client"). Client-side
 * validation runs the same shared schema the server uses (Constitution
 * IV), but the request body carries the visitor's raw typed values —
 * the server is the single place that normalises and stores.
 */
export function ContactForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Hidden spam-trap (FR-031): stays empty for real visitors.
  const [website, setWebsite] = useState("");

  const submitting = status.kind === "submitting";
  const copy = contactCopy.form;

  function updateField(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function resetForm() {
    setValues(EMPTY_VALUES);
    setFieldErrors({});
    setStatus({ kind: "idle" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const check = messageInputSchema.safeParse(values);
    if (!check.success) {
      setFieldErrors(extractFieldErrors(check.error));
      return;
    }

    setFieldErrors({});
    setStatus({ kind: "submitting" });

    try {
      const response = await fetch("/api/public/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, website_url: website }),
      });

      if (response.status === 200) {
        setValues(EMPTY_VALUES);
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
        setStatus({ kind: "error", banner: copy.errors.rateLimited });
        return;
      }

      setStatus({ kind: "error", banner: copy.errors.unavailable });
    } catch {
      setStatus({ kind: "error", banner: copy.errors.unavailable });
    }
  }

  if (status.kind === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 text-center">
        <p className="font-heading text-h3 font-bold text-foreground">{copy.success.title}</p>
        <p className="font-body text-body text-foreground">{copy.success.body}</p>
        <button type="button" onClick={resetForm} className="font-body text-body text-primary underline underline-offset-4">
          {copy.success.again}
        </button>
      </div>
    );
  }

  const messageLength = values.message.length;
  const overLimit = messageLength > MESSAGE_MAX_LENGTH;

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      {status.kind === "error" && (
        <p role="alert" className="mb-(--spacing-contact-form-gap-y) rounded-md bg-white px-3 py-2 text-center text-sm font-bold text-error">
          {status.banner}
        </p>
      )}

      <div aria-hidden="true" className="signup-honeypot">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
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
          id="contact-name"
          label={copy.placeholders.name}
          type="text"
          autoComplete="name"
          maxLength={100}
          value={values.name}
          error={fieldErrors.name}
          onChange={(value) => updateField("name", value)}
        />
        <Field
          id="contact-email"
          label={copy.placeholders.email}
          type="email"
          autoComplete="email"
          maxLength={254}
          value={values.email}
          error={fieldErrors.email}
          onChange={(value) => updateField("email", value)}
        />
        <Field
          id="contact-phone"
          label={copy.placeholders.phone}
          type="tel"
          autoComplete="off"
          maxLength={32}
          required={false}
          value={values.phone}
          error={fieldErrors.phone}
          onChange={(value) => updateField("phone", value)}
        />
        <Field
          id="contact-subject"
          label={copy.placeholders.subject}
          type="text"
          autoComplete="off"
          maxLength={150}
          value={values.subject}
          error={fieldErrors.subject}
          onChange={(value) => updateField("subject", value)}
        />

        <div className="flex flex-col gap-1 md:col-span-2">
          <label htmlFor="contact-message" className="sr-only">
            {copy.placeholders.message}
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={6}
            required
            placeholder={copy.placeholders.message}
            value={values.message}
            onChange={(event) => updateField("message", event.target.value)}
            aria-invalid={fieldErrors.message ? true : undefined}
            aria-describedby="contact-message-error"
            className="h-(--spacing-contact-textarea-height) w-full resize-none rounded-signup-input border border-signup-input-border bg-signup-input-bg px-4 py-2 font-body text-(length:--text-signup-input) text-foreground outline-none placeholder:text-signup-input-text focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p
            aria-live={messageLength >= MESSAGE_MAX_LENGTH * 0.9 ? "polite" : undefined}
            className={`text-right text-xs ${overLimit ? "text-error" : "text-muted-foreground"}`}
          >
            {copy.counter(messageLength, MESSAGE_MAX_LENGTH)}
          </p>
          {fieldErrors.message && (
            <p id="contact-message-error" className="rounded-signup-input bg-signup-input-bg px-2 py-1 text-left text-xs font-bold text-error">
              {fieldErrors.message}
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
  required?: boolean;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
}

function Field({ id, label, type, autoComplete, maxLength, required = true, value, error, onChange }: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        name={id.replace("contact-", "")}
        type={type}
        autoComplete={autoComplete}
        required={required}
        maxLength={maxLength}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-(--spacing-signup-input-height) w-full rounded-signup-input border border-signup-input-border bg-signup-input-bg px-4 font-body text-(length:--text-signup-input) text-foreground outline-none placeholder:text-signup-input-text focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error && (
        <p id={errorId} className="rounded-signup-input bg-signup-input-bg px-2 py-1 text-left text-xs font-bold text-error">
          {error}
        </p>
      )}
    </div>
  );
}
