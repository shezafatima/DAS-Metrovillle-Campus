"use client";

import { AdminDeleteDialog } from "@/components/admin/admin-delete-dialog";
import { signupsCopy } from "@/content/admin";
import { useNotifications } from "@/components/admin/notifications/notifications-provider";

export function DeleteSignupDialog({ id, name }: { id: string; name: string }) {
  const { refreshNow } = useNotifications();
  return (
    <AdminDeleteDialog
      endpoint={`/api/admin/signups/${id}`}
      itemName={name}
      onSuccess={() => refreshNow()}
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
