"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "cn";

/**
 * The one password field for the whole admin (011): login, set your
 * password, the Account page's three fields and the user panel all use it.
 *
 * - Hidden by default; an eye button toggles it. The button is a real
 *   `<button type="button">`, so Tab reaches it and Enter/Space press it;
 *   `aria-pressed` and a changing accessible name say what it will do.
 * - It goes back to hidden when its form is submitted or reset, and when
 *   the field unmounts (a closing panel), so a revealed password never
 *   outlives the moment it was needed.
 * - It renders a plain `<input>`, so `name`, `autoComplete`, `value`,
 *   `onChange` and pasting work exactly as before (password managers
 *   still see a password field while it is hidden).
 */
export function PasswordInput({
  ref: externalRef,
  className,
  showLabel = "Show password",
  hideLabel = "Hide password",
  revealNonce,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  /** Accessible name of the toggle while the password is hidden. */
  showLabel?: string;
  /** Accessible name of the toggle while the password is shown. */
  hideLabel?: string;
  /**
   * Bump this number to reveal the value (e.g. right after a "Generate"
   * button fills it in, so the admin can read it out). It never hides it.
   */
  revealNonce?: number;
}) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // A new nonce reveals the value. Adjusting state while rendering (rather than
  // in an effect) is React's recommended way to react to a changed prop.
  const [seenNonce, setSeenNonce] = useState(revealNonce ?? 0);
  if ((revealNonce ?? 0) !== seenNonce) {
    setSeenNonce(revealNonce ?? 0);
    if (revealNonce) setVisible(true);
  }

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const hide = () => setVisible(false);
    form.addEventListener("submit", hide);
    form.addEventListener("reset", hide);
    return () => {
      form.removeEventListener("submit", hide);
      form.removeEventListener("reset", hide);
    };
  }, []);

  return (
    <div className="relative w-full">
      <input
        {...props}
        ref={(node) => {
          inputRef.current = node;
          if (typeof externalRef === "function") externalRef(node);
          else if (externalRef) externalRef.current = node;
        }}
        type={visible ? "text" : "password"}
        data-slot="password-input"
        className={cn(
          "flex h-9 w-full min-w-0 rounded-md border border-input bg-background py-1 pr-10 pl-3 font-light text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow]",
          "placeholder:text-muted-foreground",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
