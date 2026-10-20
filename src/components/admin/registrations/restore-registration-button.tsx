"use client";

import { useRouter } from "next/navigation";
import { AdminConfirmDeleteDialog } from "@/components/admin/admin-delete-dialog";
import { useNotifications } from "@/components/admin/notifications/notifications-provider";
import { toast } from "@/components/ui/toaster";
import { registrationsAdminCopy } from "@/content/admin";

/** Confirm, then POST restore. A 404 means the 30 days (or the retention period) have ended. */
export function RestoreRegistrationButton({ id, reference }: { id: string; reference: string }) {
  const router = useRouter();
  const { refreshNow } = useNotifications();
  const copy = registrationsAdminCopy.restoreDialog;

  async function restore() {
    try {
      const response = await fetch(`/api/admin/registrations/${id}/restore`, { method: "POST" });
      if (response.ok) {
        toast({ title: copy.done, type: "success" });
        refreshNow();
      } else if (response.status === 404) {
        toast({ title: copy.notRestorable, type: "error" });
      } else {
        toast({ title: copy.unavailable, type: "error" });
      }
      router.refresh();
    } catch {
      toast({ title: copy.unavailable, type: "error" });
    }
  }

  return (
    <AdminConfirmDeleteDialog
      itemName={reference}
      triggerLabel={copy.trigger}
      copy={{ trigger: copy.trigger, title: copy.title, body: copy.body, cancel: copy.cancel, confirm: copy.confirm }}
      onConfirm={restore}
    />
  );
}
