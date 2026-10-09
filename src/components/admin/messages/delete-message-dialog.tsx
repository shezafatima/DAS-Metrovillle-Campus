"use client";

import { AdminDeleteDialog } from "@/components/admin/admin-delete-dialog";
import { messagesCopy } from "@/content/admin";
import { useNotifications } from "@/components/admin/notifications/notifications-provider";

export interface DeleteMessageDialogProps {
  id: string;
  subject: string;
  redirectTo?: string;
  triggerLabel?: string;
}

export function DeleteMessageDialog({ id, subject, redirectTo, triggerLabel }: DeleteMessageDialogProps) {
  const { refreshNow } = useNotifications();
  return (
    <AdminDeleteDialog
      endpoint={`/api/admin/messages/${id}`}
      itemName={subject}
      redirectTo={redirectTo}
      triggerLabel={triggerLabel}
      onSuccess={() => refreshNow()}
      copy={{
        trigger: messagesCopy.table.delete,
        title: messagesCopy.deleteDialog.title,
        body: messagesCopy.deleteDialog.body,
        cancel: messagesCopy.deleteDialog.cancel,
        confirm: messagesCopy.deleteDialog.confirm,
        toasts: messagesCopy.toasts,
      }}
    />
  );
}
