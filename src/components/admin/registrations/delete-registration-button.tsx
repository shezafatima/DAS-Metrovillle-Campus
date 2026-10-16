"use client";

import { AdminDeleteDialog } from "@/components/admin/admin-delete-dialog";
import { useNotifications } from "@/components/admin/notifications/notifications-provider";
import { registrationsAdminCopy } from "@/content/admin";

/** Confirm, then DELETE (main admin only: the route refuses everyone else). Goes back to the list. */
export function DeleteRegistrationButton({ id, reference }: { id: string; reference: string }) {
  const { refreshNow } = useNotifications();
  const copy = registrationsAdminCopy;
  return (
    <AdminDeleteDialog
      endpoint={`/api/admin/registrations/${id}`}
      itemName={reference}
      redirectTo="/admin/registrations"
      triggerLabel={copy.deleteDialog.trigger}
      onSuccess={() => refreshNow()}
      copy={{ ...copy.deleteDialog, toasts: copy.toasts }}
    />
  );
}
