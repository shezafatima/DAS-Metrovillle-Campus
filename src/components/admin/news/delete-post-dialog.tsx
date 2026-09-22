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
import { newsCopy } from "@/content/admin";

export function DeletePostDialog({ id, title }: { id: string; title: string }) {
  const router = useRouter();

  async function handleDelete() {
    try {
      const response = await fetch(`/api/admin/news/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: newsCopy.toasts.deleted, type: "success" });
        router.refresh();
      } else {
        toast({ title: newsCopy.toasts.unavailable, type: "error" });
      }
    } catch {
      toast({ title: newsCopy.toasts.unavailable, type: "error" });
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`${newsCopy.table.delete}: ${title}`}>
            <Trash2 aria-hidden="true" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{newsCopy.deleteDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>{newsCopy.deleteDialog.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{newsCopy.deleteDialog.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>{newsCopy.deleteDialog.confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
