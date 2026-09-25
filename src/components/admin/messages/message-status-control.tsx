"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { messagesCopy } from "@/content/admin";
import { MESSAGE_STATUSES, statusLabel, type MessageStatus } from "@/lib/messages/statuses";

export interface MessageStatusControlProps {
  id: string;
  status: MessageStatus;
}

/**
 * The parent must render this with `key={status}` so a server-side
 * status change (MarkReadOnOpen's router.refresh(), or a change made in
 * another tab) remounts it with the fresh value — otherwise the initial
 * `saved` state would keep showing the stale status after an auto-read
 * (sp.analyze U1).
 */
export function MessageStatusControl({ id, status }: MessageStatusControlProps) {
  const router = useRouter();
  const [saved, setSaved] = useState<MessageStatus>(status);
  const [pending, setPending] = useState(false);

  async function save(next: MessageStatus) {
    setPending(true);
    try {
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (response.ok) {
        const body = await response.json();
        setSaved(body.status);
        toast({ title: messagesCopy.toasts.statusSaved(statusLabel(body.status)), type: "success" });
        router.refresh();
      } else if (response.status === 404) {
        toast({ title: messagesCopy.toasts.gone, type: "error" });
        router.refresh();
      } else {
        toast({ title: messagesCopy.toasts.statusFailed, type: "error" });
      }
    } catch {
      toast({ title: messagesCopy.toasts.statusFailed, type: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label={messagesCopy.detail.status}
        value={saved}
        disabled={pending}
        onChange={(event) => save(event.target.value as MessageStatus)}
      >
        {MESSAGE_STATUSES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </Select>
      {saved !== "responded" && (
        <Button type="button" disabled={pending} onClick={() => save("responded")}>
          {messagesCopy.detail.markResponded}
        </Button>
      )}
    </div>
  );
}
