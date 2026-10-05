"use client";

import { AdminDeleteDialog } from "@/components/admin/admin-delete-dialog";
import { careersAdminCopy } from "@/content/admin";
import { useNotifications } from "@/components/admin/notifications/notifications-provider";

/**
 * Confirm, then DELETE (main admin only: the route refuses everyone else).
 * On success it goes back to the list and refreshes the live counts.
 */
export function DeleteApplicationButton({ id, name }: { id: string; name: string }) {
  const { refreshNow } = useNotifications();
  return (
    <AdminDeleteDialog
      endpoint={`/api/admin/careers/${id}`}
      itemName={name}
      redirectTo="/admin/careers"
      triggerLabel={careersAdminCopy.deleteDialog.trigger}
      onSuccess={() => refreshNow()}
      copy={{
        trigger: careersAdminCopy.deleteDialog.trigger,
        title: careersAdminCopy.deleteDialog.title,
        body: careersAdminCopy.deleteDialog.body,
        cancel: careersAdminCopy.deleteDialog.cancel,
        confirm: careersAdminCopy.deleteDialog.confirm,
        toasts: careersAdminCopy.toasts,
      }}
    />
  );
}
