"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { SignOutOthersButton } from "@/components/admin/account/sign-out-others-button";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import { changePassword, type ChangePasswordState } from "@/app/admin/(dashboard)/account/actions";
import { validateChangePassword, type ChangePasswordErrorKey } from "@/lib/validation/account";
import { accountCopy } from "@/content/admin";

const initialState: ChangePasswordState = { status: "idle" };
const LOGIN_AGAIN_HREF = `/admin/login?next=${encodeURIComponent("/admin/account")}`;
const copy = accountCopy.changePassword;

interface ChangePasswordFormProps {
  email: string;
  /** Lets the page update "Password last changed" without a reload (US2 sc.2). */
  onPasswordChanged?: (isoDate: string) => void;
}

/**
 * Change password (010 US1, contracts/profile-menu-ui.md). Follows the
 * 002 login form (useActionState, copy keys only, role=alert/status),
 * except the fields are controlled: typed values stay on screen after a
 * failure without ever being sent back from the server (FR-015), and
 * "dirty" drives the unsaved-changes warning (FR-017).
 */
export function ChangePasswordForm({ email, onPasswordChanged }: ChangePasswordFormProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState<ChangePasswordErrorKey | null>(null);
  const currentRef = useRef<HTMLInputElement>(null);
  // Blocks a second submit fired before React re-renders with `pending`.
  const inFlight = useRef(false);

  function clearAll() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function applyResult(result: ChangePasswordState) {
    switch (result.status) {
      case "success":
      case "changed_others_remain":
        clearAll();
        onPasswordChanged?.(result.passwordChangedAt);
        break;
      case "changed_signed_out":
      case "unconfirmed":
        // The password may now be the new one, so what was typed is stale.
        clearAll();
        break;
      case "error":
        if (result.error === "unauthorized") router.replace(LOGIN_AGAIN_HREF);
        else if (result.error === "wrong_current") setCurrentPassword("");
        break;
    }
  }

  // Each result is handled where the action returns (not in an effect),
  // so the field updates land with the result itself.
  const [state, formAction, pending] = useActionState(
    async (prevState: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> => {
      const result = await changePassword(prevState, formData);
      inFlight.current = false;
      applyResult(result);
      return result;
    },
    initialState,
  );

  // DOM-only follow-up once the wrong-current message has rendered.
  useEffect(() => {
    if (state.status === "error" && state.error === "wrong_current") currentRef.current?.focus();
  }, [state]);

  const dirty = currentPassword !== "" || newPassword !== "" || confirmPassword !== "";
  useUnsavedChanges(dirty, accountCopy.unsavedPrompt);

  // Dispatched from onSubmit inside a transition rather than via
  // <form action>: React's automatic reset after a form action would put
  // the (controlled) fields back to stale DOM defaults, undoing the
  // clearing below and re-showing typed passwords after success.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || pending) return;
    const invalid = validateChangePassword({ currentPassword, newPassword, confirmPassword });
    setClientError(invalid);
    if (invalid) return;
    inFlight.current = true;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {/* Gives password managers the account identifier to save against. */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            tabIndex={-1}
            className="sr-only"
          />

          <PasswordField
            id="currentPassword"
            label={copy.currentLabel}
            autoComplete="current-password"
            value={currentPassword}
            onChange={setCurrentPassword}
            inputRef={currentRef}
          />
          <PasswordField
            id="newPassword"
            label={copy.newLabel}
            hint={copy.newHint}
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordField
            id="confirmPassword"
            label={copy.confirmLabel}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />

          <ResultMessage state={state} clientError={clientError} />

          <Button type="submit" disabled={pending} className="self-start">
            {pending ? copy.submitting : copy.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordField({
  id,
  label,
  hint,
  autoComplete,
  value,
  onChange,
  inputRef,
}: {
  id: string;
  label: string;
  hint?: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-bold text-foreground text-sm">
        {label}
      </label>
      <PasswordInput
        ref={inputRef}
        id={id}
        name={id}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hintId}
      />
      {hint && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}

function ResultMessage({ state, clientError }: { state: ChangePasswordState; clientError: ChangePasswordErrorKey | null }) {
  if (clientError) {
    return <Alert>{accountCopy.errors[clientError]}</Alert>;
  }
  switch (state.status) {
    case "success":
      return <Status>{accountCopy.success}</Status>;
    case "changed_others_remain":
      return (
        <div className="flex flex-col gap-2">
          <Status>{accountCopy.changedOthersRemain}</Status>
          <SignOutOthersButton />
        </div>
      );
    case "changed_signed_out":
      return (
        <Status>
          {accountCopy.changedSignedOut}{" "}
          <Link href={LOGIN_AGAIN_HREF} className="font-bold underline">
            {accountCopy.loginAgainLink}
          </Link>
        </Status>
      );
    case "unconfirmed":
      return <Alert>{accountCopy.unconfirmed}</Alert>;
    case "error":
      return state.error === "unauthorized" ? null : <Alert>{accountCopy.errors[state.error]}</Alert>;
    default:
      return null;
  }
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="font-body text-destructive text-sm">
      {children}
    </p>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="font-body text-foreground text-sm">
      {children}
    </p>
  );
}
