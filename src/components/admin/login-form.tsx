"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { login, type LoginActionState } from "@/app/admin/login/actions";
import { loginCopy } from "@/content/admin";
import { HONEYPOT_FIELD } from "@/lib/honeypot";

const initialState: LoginActionState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      {/* Hidden spam-trap field (FR-031). Real visitors never see or
          fill this; a filled value is treated as an automated
          submission and rejected with the same generic message. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Website</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-button text-sm text-text">
          {loginCopy.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded-md border border-neutral-100 px-3 py-2 font-body text-body text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="font-button text-sm text-text">
          {loginCopy.passwordLabel}
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          className="h-auto rounded-md border-neutral-100 px-3 py-2 font-body text-body text-text"
        />
      </div>

      {state.error && (
        <p role="alert" className="font-body text-body text-destructive">
          {loginCopy.errors[state.error]}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {loginCopy.submit}
      </Button>
    </form>
  );
}
