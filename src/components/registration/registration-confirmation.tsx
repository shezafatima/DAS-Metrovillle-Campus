"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { registrationCopy } from "@/content/registration";

/** Shown after a saved registration: the reference prominently, with the "keep it" text. */
export function RegistrationConfirmation({ reference }: { reference: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const copy = registrationCopy.confirmation;

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div ref={ref} role="status" tabIndex={-1} className="flex flex-col items-center gap-3 text-center outline-none">
      <p className="font-heading text-h3 font-bold text-foreground">{copy.title}</p>
      <p className="font-body text-body text-foreground">
        {copy.lead} <strong data-testid="registration-reference" className="font-heading text-h3 tracking-widest">{reference}</strong>
      </p>
      <p className="font-body text-body text-foreground">{copy.keep}</p>
      <Link href="/admission" className="font-body text-body text-primary underline underline-offset-4">
        {copy.backLink}
      </Link>
    </div>
  );
}
