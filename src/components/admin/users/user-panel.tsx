"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "@/components/ui/toaster";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usersCopy } from "@/content/admin";
import { PERMISSION_KEYS, PERMISSION_LABELS, type Permission, type Role } from "@/lib/permissions";
import { generatePassword } from "@/lib/generate-password";
import { adminSetPasswordSchema, type UserActionErrorKey, type UserFormField } from "@/lib/validation/users";

const copy = usersCopy.panel;

/** What the create and edit actions return (contracts/user-actions.md). Never a password. */
export type UserPanelState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; error: UserActionErrorKey; field?: UserFormField };

export type UserPanelAction = (prev: UserPanelState, formData: FormData) => Promise<UserPanelState>;

export interface EditableUser {
  id: string;
  email: string;
  role: Role;
  permissions: Permission[];
}

interface UserPanelProps {
  mode: "create" | "edit";
  action: UserPanelAction;
  user?: EditableUser;
  /** The button that opens the panel. */
  triggerLabel: string;
  triggerVariant?: "default" | "outline" | "ghost";
  /** Accessible name for the trigger when the visible label is not enough (e.g. it names the row's user). */
  triggerAriaLabel?: string;
}

/**
 * Add or edit a user in a panel that slides in from the right over the
 * list (011 US1/US4, contracts/users-ui.md). It holds the email, the role,
 * the password and — for a content manager only — the section tickboxes.
 *
 * - Escape, a click outside and Cancel all ask first when anything has been
 *   typed or changed, so nothing is lost by accident.
 * - The password is typed or generated with one click, and can be revealed
 *   to read it out. It lives only in this panel's state: the form is
 *   mounted only while the panel is open, so closing it discards the value
 *   and it is never shown again. The main admin controls every password.
 * - Saving closes the panel; the list refreshes with the change.
 */
export function UserPanel({ mode, action, user, triggerLabel, triggerVariant = "outline", triggerAriaLabel }: UserPanelProps) {
  const [open, setOpen] = useState(false);
  const dirtyRef = useRef(false);

  function requestOpenChange(next: boolean) {
    // Closing by any route (Escape, outside click, the X, Cancel) with
    // unsaved input asks first. Saying no leaves the panel exactly as it was.
    if (!next && dirtyRef.current && !window.confirm(copy.discardPrompt)) return;
    if (!next) dirtyRef.current = false;
    setOpen(next);
  }

  const closeAfterSave = useCallback(() => {
    dirtyRef.current = false;
    setOpen(false);
  }, []);

  return (
    <Sheet open={open} onOpenChange={requestOpenChange}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant={triggerVariant}
            size={mode === "edit" ? "sm" : "default"}
            aria-label={triggerAriaLabel}
          />
        }
      >
        {triggerLabel}
      </SheetTrigger>
      <SheetContent closeLabel={copy.close}>
        <SheetHeader>
          <SheetTitle>{mode === "create" ? copy.createTitle : copy.editTitle}</SheetTitle>
          <SheetDescription>{mode === "create" ? copy.createIntro : copy.editIntro}</SheetDescription>
        </SheetHeader>
        <PanelForm
          mode={mode}
          action={action}
          user={user}
          onDirtyChange={(dirty) => {
            dirtyRef.current = dirty;
          }}
          onCancel={() => requestOpenChange(false)}
          onSaved={closeAfterSave}
        />
      </SheetContent>
    </Sheet>
  );
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

function PanelForm({
  mode,
  action,
  user,
  onDirtyChange,
  onCancel,
  onSaved,
}: {
  mode: "create" | "edit";
  action: UserPanelAction;
  user?: EditableUser;
  onDirtyChange: (dirty: boolean) => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as UserPanelState);
  const initialRole: Role = user?.role ?? "content_manager";
  const initialPermissions = user?.permissions ?? [];

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(initialRole);
  const [granted, setGranted] = useState<Set<Permission>>(new Set(initialPermissions));
  const [password, setPassword] = useState("");
  const [revealNonce, setRevealNonce] = useState(0);
  const [passwordError, setPasswordError] = useState(false);

  // Anything typed or changed counts (create: from empty/default; edit: from what was loaded).
  const dirty =
    password !== "" ||
    role !== initialRole ||
    (mode === "create" && email !== "") ||
    (role === "content_manager" && !sameSet([...granted], initialPermissions));
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const saved = state.status === "success";
  useEffect(() => {
    if (!saved) return;
    toast({ title: mode === "create" ? usersCopy.toasts.created : usersCopy.toasts.saved, type: "success" });
    onSaved();
    router.refresh();
  }, [saved, mode, onSaved, router]);

  function toggle(key: Permission, checked: boolean) {
    setGranted((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function generate() {
    setPassword(generatePassword());
    setPasswordError(false);
    // Shown right away, so the admin can read it out before saving.
    setRevealNonce((n) => n + 1);
  }

  // Same length rules as the server, checked here first so nothing is sent
  // (and, on an edit, no half of it is applied) with a password that would be refused.
  function validateBeforeSubmit(event: React.FormEvent<HTMLFormElement>) {
    const needsPassword = mode === "create" || password !== "";
    if (needsPassword && !adminSetPasswordSchema.safeParse(password).success) {
      event.preventDefault();
      setPasswordError(true);
      return;
    }
    setPasswordError(false);
  }

  const serverPasswordError = state.status === "error" && state.field === "password";
  // An error that belongs to a field is shown under that field, not twice.
  const generalError = state.status === "error" && !state.field ? usersCopy.errors[state.error] : null;
  const emailMessage = state.status === "error" && state.field === "email"
    ? state.error === "email_taken"
      ? usersCopy.errors.email_taken
      : usersCopy.errors.invalidEmail
    : null;
  const showPasswordError = passwordError || serverPasswordError;

  return (
    <form action={formAction} onSubmit={validateBeforeSubmit} className="flex flex-1 flex-col gap-5" noValidate>
      {mode === "edit" && user && <input type="hidden" name="targetId" value={user.id} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="user-email" className="font-bold text-foreground text-sm">
          {copy.emailLabel}
        </label>
        {mode === "create" ? (
          <Input
            id="user-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={emailMessage ? true : undefined}
            aria-describedby={emailMessage ? "user-email-error" : undefined}
          />
        ) : (
          <p id="user-email" className="break-all font-light text-foreground text-sm">
            {user?.email}
          </p>
        )}
        {emailMessage && (
          <p id="user-email-error" role="alert" className="text-destructive text-sm">
            {emailMessage}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-bold text-foreground text-sm">{copy.roleLabel}</legend>
        {(["content_manager", "main_admin"] as const).map((value) => (
          <label key={value} className="flex items-center gap-2 font-light text-foreground text-sm">
            <input
              type="radio"
              name="role"
              value={value}
              checked={role === value}
              onChange={() => setRole(value)}
              className="size-4 accent-primary"
            />
            {usersCopy.roles[value]}
          </label>
        ))}
      </fieldset>

      {/* Sections exist only for a content manager: a main admin implicitly has everything. */}
      {role === "content_manager" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-bold text-foreground text-sm">{copy.sectionsLabel}</legend>
          {PERMISSION_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 font-light text-foreground text-sm">
              <input
                type="checkbox"
                name="permissions"
                value={key}
                checked={granted.has(key)}
                onChange={(event) => toggle(key, event.target.checked)}
                className="size-4 accent-primary"
              />
              {PERMISSION_LABELS[key]}
            </label>
          ))}
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="user-password" className="font-bold text-foreground text-sm">
          {mode === "create" ? copy.passwordLabel : copy.passwordEditLabel}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <PasswordInput
            id="user-password"
            name="password"
            autoComplete="new-password"
            required={mode === "create"}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setPasswordError(false);
            }}
            revealNonce={revealNonce}
            showLabel={copy.showPassword}
            hideLabel={copy.hidePassword}
            aria-invalid={showPasswordError ? true : undefined}
            aria-describedby="user-password-hint"
            className="font-mono"
          />
          <Button type="button" variant="outline" onClick={generate} className="shrink-0">
            {copy.generate}
          </Button>
        </div>
        <p id="user-password-hint" className="font-light text-muted-foreground text-xs">
          {mode === "create" ? copy.passwordHint : copy.passwordEditHint}
        </p>
        {showPasswordError && (
          <p role="alert" className="text-destructive text-sm">
            {usersCopy.errors.invalidPassword}
          </p>
        )}
      </div>

      {generalError && (
        <p role="alert" className="font-body text-destructive text-sm">
          {generalError}
        </p>
      )}

      <div className="mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {mode === "create" ? (pending ? copy.creating : copy.create) : pending ? copy.saving : copy.save}
        </Button>
      </div>
    </form>
  );
}
