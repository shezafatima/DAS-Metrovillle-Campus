import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/dal";
import { getMessage } from "@/lib/messages/admin-queries";
import { inboxHref } from "@/lib/messages/inbox-href";
import { MessageDetail } from "@/components/admin/messages/message-detail";
import { MarkReadOnOpen } from "@/components/admin/messages/mark-read-on-open";
import { MessageStatusControl } from "@/components/admin/messages/message-status-control";
import { DeleteMessageDialog } from "@/components/admin/messages/delete-message-dialog";
import { messagesCopy } from "@/content/admin";

export const metadata: Metadata = { title: "Message" };
export const dynamic = "force-dynamic";

export default async function AdminMessageDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/messages/[id]">) {
  await requireAdminSession();

  const { id } = await params;
  const search = await searchParams;
  const from = typeof search.from === "string" ? search.from : undefined;
  const backHref = inboxHref(from);

  const message = await getMessage(id);
  if (!message) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <p className="text-foreground">{messagesCopy.detail.gone}</p>
        <Link href={backHref} className="text-primary hover:underline">
          {messagesCopy.detail.back}
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Rendered unconditionally on status — see mark-read-on-open.tsx for why. */}
      <MarkReadOnOpen key={message.id} id={message.id} status={message.status} />
      <MessageDetail
        message={message}
        backHref={backHref}
        actions={
          <>
            <MessageStatusControl key={message.status} id={message.id} status={message.status} />
            <DeleteMessageDialog
              id={message.id}
              subject={message.subject}
              redirectTo={backHref}
              triggerLabel={messagesCopy.deleteDialog.confirm}
            />
          </>
        }
      />
    </>
  );
}
