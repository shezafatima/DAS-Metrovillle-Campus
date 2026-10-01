"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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

export interface AdminConfirmDeleteCopy {
  trigger: string;
  title: string;
  body: string;
  cancel: string;
  confirm: string;
}

export interface AdminConfirmDeleteDialogProps {
  itemName: string;
  copy: AdminConfirmDeleteCopy;
  /** Runs after the admin confirms. The dialog closes itself; what "delete" means is the caller's. */
  onConfirm: () => void;
  /** When set, renders an outline text button instead of the default ghost icon trigger. */
  triggerLabel?: string;
  disabled?: boolean;
}

/**
 * The confirm step on its own (005 Settings): a slide or gallery image is
 * removed from the form and only leaves the site when the group is saved,
 * so there is no request to make here — just "are you sure?". The request
 * -making AdminDeleteDialog below is built on it.
 */
export function AdminConfirmDeleteDialog({ itemName, copy, onConfirm, triggerLabel, disabled }: AdminConfirmDeleteDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={disabled}
        render={
          triggerLabel ? (
            <Button type="button" variant="outline" disabled={disabled}>
              {triggerLabel}
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} aria-label={`${copy.trigger}: ${itemName}`}>
              <Trash2 aria-hidden="true" />
            </Button>
          )
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{copy.confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface AdminDeleteDialogCopy {
  trigger: string;
  title: string;
  body: string;
  cancel: string;
  confirm: string;
  toasts: { deleted: string; gone: string; unavailable: string };
}

export interface AdminDeleteDialogProps {
  endpoint: string;
  itemName: string;
  copy: AdminDeleteDialogCopy;
  /** Navigate here after a successful delete instead of just refreshing (e.g. from a detail page back to its list). */
  redirectTo?: string;
  /** When set, renders an outline text button instead of the default ghost icon trigger. */
  triggerLabel?: string;
  /** Called after a successful (200) delete, before the navigation below (009 — keeps notification indicators live). */
  onSuccess?: () => void;
}

/**
 * Generic confirm-delete dialog, lifted from DeleteSignupDialog (research
 * §2 / Constitution VI) so every admin list/detail page shares one
 * implementation instead of a near-identical copy per feature.
 */
export function AdminDeleteDialog({ endpoint, itemName, copy, redirectTo, triggerLabel, onSuccess }: AdminDeleteDialogProps) {
  const router = useRouter();

  function afterDelete() {
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  async function handleDelete() {
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (response.ok) {
        toast({ title: copy.toasts.deleted, type: "success" });
        onSuccess?.();
        afterDelete();
      } else if (response.status === 404) {
        // Deleted from another tab/window between this row loading and
        // the admin confirming — a clear message, not a generic error.
        toast({ title: copy.toasts.gone, type: "error" });
        afterDelete();
      } else {
        toast({ title: copy.toasts.unavailable, type: "error" });
      }
    } catch {
      toast({ title: copy.toasts.unavailable, type: "error" });
    }
  }

  return (
    <AdminConfirmDeleteDialog
      itemName={itemName}
      copy={copy}
      triggerLabel={triggerLabel}
      onConfirm={handleDelete}
    />
  );
}
