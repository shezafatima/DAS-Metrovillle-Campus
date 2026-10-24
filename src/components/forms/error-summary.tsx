"use client";

import { useEffect, useId, useRef } from "react";
import { formsCopy } from "@/content/forms";

export interface ErrorSummaryItem {
  /** The request key, used as the React key. */
  field: string;
  /** The id of the control this problem is about. */
  targetId: string;
  message: string;
}

/**
 * The list of problems shown at the top of a form after a failed submit. Each problem is a link that moves
 * focus to its field. The summary itself takes focus when `focusSignal` changes (the parent bumps it on each
 * failed submit), so a screen reader announces its name and the visitor lands on it.
 *
 * It is a labelled section, deliberately not `role="alert"`: the form's own banner is the one alert, and a second
 * one would be read twice.
 */
export function ErrorSummary({ items, focusSignal }: { items: ErrorSummaryItem[]; focusSignal: number }) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (focusSignal > 0) ref.current?.focus();
    // Only a new failed submit moves focus, not every change to the list while the visitor fixes fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSignal]);

  if (items.length === 0) return null;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby={titleId}
      data-testid="error-summary"
      className="scroll-mt-(--form-scroll-offset) rounded-xl border-2 border-error-strong bg-white p-4 outline-none focus-visible:ring-4 focus-visible:ring-gold/40"
    >
      <h2 id={titleId} className="font-bold font-heading text-error-strong text-h3">
        {formsCopy.errorSummary.title}
      </h2>
      <ul className="mt-2 flex flex-col gap-1 font-body text-sm">
        {items.map((item) => (
          <li key={item.field}>
            <a
              href={`#${item.targetId}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(item.targetId)?.focus();
              }}
              className="inline-block min-h-11 py-2 text-error-strong underline underline-offset-2 hover:no-underline"
            >
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
