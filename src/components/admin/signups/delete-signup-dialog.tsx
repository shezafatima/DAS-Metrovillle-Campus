"use client";

import { AdminDeleteDialog } from "@/components/admin/admin-delete-dialog";
import { signupsCopy } from "@/content/admin";

export function DeleteSignupDialog({ id, name }: { id: string; name: string }) {
  return (
    <AdminDeleteDialog
      endpoint={`/api/admin/signups/${id}`}
      itemName={name}
      copy={{
        trigger: signupsCopy.table.delete,
        title: signupsCopy.deleteDialog.title,
        body: signupsCopy.deleteDialog.body,
        cancel: signupsCopy.deleteDialog.cancel,
        confirm: signupsCopy.deleteDialog.confirm,
        toasts: signupsCopy.toasts,
      }}
    />
  );
}
