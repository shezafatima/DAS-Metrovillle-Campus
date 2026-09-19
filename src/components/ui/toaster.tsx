"use client";

import { Toast } from "@base-ui/react/toast";

const { createToastManager, useToastManager } = Toast;
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "cn";

/**
 * Global toast manager — call toast.add({ title, type: "success" | "error", ... })
 * from anywhere (form actions, event handlers), same shape as sonner's
 * toast() function. Mount <Toaster /> once, near the root of the admin
 * layout, to actually render the queued toasts.
 */
export const toastManager = createToastManager();

export function toast(options: Parameters<typeof toastManager.add>[0]) {
  return toastManager.add(options);
}

function ToastList() {
  const { toasts } = useToastManager();
  return toasts.map((t) => (
    <Toast.Root
      key={t.id}
      toast={t}
      className={cn(
        "relative flex w-80 items-start gap-2.5 rounded-lg border p-4 shadow-lg",
        "motion-safe:transition-all motion-safe:duration-(--motion-medium)",
        "data-[starting-style]:translate-x-full data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        t.type === "error" ? "border-destructive/30 bg-background" : "border-border bg-background",
      )}
    >
      {t.type === "error" ? (
        <XCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
      ) : (
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
      )}
      <div className="flex flex-1 flex-col gap-0.5">
        {t.title && <Toast.Title className="font-bold text-sm text-foreground">{t.title}</Toast.Title>}
        {t.description && (
          <Toast.Description className="font-light text-sm text-muted-foreground">
            {t.description}
          </Toast.Description>
        )}
      </div>
      <Toast.Close aria-label="Dismiss" className="shrink-0 text-muted-foreground">
        <X className="size-4" />
      </Toast.Close>
    </Toast.Root>
  ));
}

export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager}>
      <Toast.Portal>
        <Toast.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
