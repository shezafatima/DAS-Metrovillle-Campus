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
}

/**
 * Generic confirm-delete dialog, lifted from DeleteSignupDialog (research
 * §2 / Constitution VI) so every admin list/detail page shares one
 * implementation instead of a near-identical copy per feature.
 */
export function AdminDeleteDialog({ endpoint, itemName, copy, redirectTo, triggerLabel }: AdminDeleteDialogProps) {
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
    <AlertDialog>
      <AlertDialogTrigger
        render={
          triggerLabel ? (
            <Button type="button" variant="outline">
              {triggerLabel}
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`${copy.trigger}: ${itemName}`}>
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
          <AlertDialogAction onClick={handleDelete}>{copy.confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
