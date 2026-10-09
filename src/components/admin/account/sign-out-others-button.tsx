"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { signOutOtherDevices, type SignOutOthersState } from "@/app/admin/(dashboard)/account/actions";
import { accountCopy } from "@/content/admin";

const initialState: SignOutOthersState = { status: "idle" };
const copy = accountCopy.signOutOthers;

/**
 * "Sign out other devices" with a confirm step (010 FR-013), shared by
 * the Account page's card and the change-password form's partial-save
 * message (FR-011b). Same dialog structure as AdminDeleteDialog.
 */
export function SignOutOthersButton() {
  const [state, dispatch, pending] = useActionState(signOutOtherDevices, initialState);

  function confirm() {
    startTransition(() => dispatch());
  }

  const message =
    state.status === "success" ? copy.success : state.status === "error" && state.error !== "unauthorized" ? copy.unavailable : null;

  return (
    <div className="flex flex-col items-start gap-2">
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button type="button" variant="outline" disabled={pending}>
              {copy.button}
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.dialogBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>{copy.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {message && (
        <p role="status" className="font-body text-sm text-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
