"use client";

import { startTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
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
import { UserPanel, type EditableUser } from "@/components/admin/users/user-panel";
import {
  deleteUser,
  disableUser,
  enableUser,
  updateUserAccess,
  type ManageUserState,
} from "@/app/admin/(dashboard)/users/actions";
import { usersCopy } from "@/content/admin";
import type { UserStatus } from "@/lib/users/queries";

const actionsCopy = usersCopy.actions;
const confirmCopy = usersCopy.confirm;

export interface RowUser extends EditableUser {
  status: UserStatus;
}

/**
 * The per-row controls on the Users page (011 contracts/users-ui.md). The
 * caller's OWN row offers none of Edit / Disable / Delete and points at the
 * Account page for the password (FR-026): they are refused on the server
 * too, so hiding them is presentation, not protection. Password reset lives
 * in the Edit panel.
 */
export function UserRowActions({ user, isSelf }: { user: RowUser; isSelf: boolean }) {
  if (isSelf) {
    return (
      <Link href="/admin/account" className="font-light text-muted-foreground text-sm underline">
        {actionsCopy.changeOwnPassword}
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <UserPanel
        mode="edit"
        action={updateUserAccess}
        user={user}
        triggerLabel={actionsCopy.editAccess}
        triggerAriaLabel={`${actionsCopy.editAccess}: ${user.email}`}
      />
      {user.status === "disabled" ? (
        <ConfirmAction
          user={user}
          action={enableUser}
          trigger={actionsCopy.enable}
          title={confirmCopy.enableTitle}
          body={confirmCopy.enableBody}
          confirm={confirmCopy.enableConfirm}
          success={usersCopy.toasts.enabled}
        />
      ) : (
        <ConfirmAction
          user={user}
          action={disableUser}
          trigger={actionsCopy.disable}
          title={confirmCopy.disableTitle}
          body={confirmCopy.disableBody}
          confirm={confirmCopy.disableConfirm}
          success={usersCopy.toasts.disabled}
        />
      )}
      <ConfirmAction
        user={user}
        action={deleteUser}
        trigger={actionsCopy.delete}
        title={confirmCopy.deleteTitle}
        body={confirmCopy.deleteBody}
        confirm={confirmCopy.deleteConfirm}
        success={usersCopy.toasts.deleted}
      />
    </div>
  );
}

function ConfirmAction({
  user,
  action,
  trigger,
  title,
  body,
  confirm,
  success,
}: {
  user: RowUser;
  action: (prev: ManageUserState, formData: FormData) => Promise<ManageUserState>;
  trigger: string;
  title: string;
  body: string;
  confirm: string;
  success: string;
}) {
  function run() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("targetId", user.id);
      try {
        const result = await action({ status: "idle" }, formData);
        if (result.status === "error") toast({ title: usersCopy.errors[result.error], type: "error" });
        else toast({ title: success, type: "success" });
      } catch {
        toast({ title: usersCopy.errors.unavailable, type: "error" });
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" aria-label={`${trigger}: ${user.email}`}>
            {trigger}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {user.email} — {body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{confirmCopy.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={run}>{confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
