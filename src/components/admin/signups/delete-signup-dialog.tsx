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
import { signupsCopy } from "@/content/admin";

export function DeleteSignupDialog({ id, name }: { id: string; name: string }) {
  const router = useRouter();

  async function handleDelete() {
    try {
      const response = await fetch(`/api/admin/signups/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: signupsCopy.toasts.deleted, type: "success" });
        router.refresh();
      } else if (response.status === 404) {
        // Deleted from another tab/window between this row loading and
        // the admin confirming — a clear message, not a generic error.
        toast({ title: signupsCopy.toasts.gone, type: "error" });
        router.refresh();
      } else {
        toast({ title: signupsCopy.toasts.unavailable, type: "error" });
      }
    } catch {
      toast({ title: signupsCopy.toasts.unavailable, type: "error" });
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`${signupsCopy.table.delete}: ${name}`}>
            <Trash2 aria-hidden="true" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{signupsCopy.deleteDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{signupsCopy.deleteDialog.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{signupsCopy.deleteDialog.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>{signupsCopy.deleteDialog.confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
