import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { messagesCopy } from "@/content/admin";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import { isRtlScript } from "@/lib/rtl-text";
import type { MessageDetail as MessageDetailData } from "@/lib/messages/admin-queries";

const STATUS_VARIANT = {
  new: "highlight",
  read: "secondary",
  responded: "outline",
} as const;

const STATUS_LABEL = {
  new: "New",
  read: "Read",
  responded: "Responded",
} as const;

export interface MessageDetailProps {
  message: MessageDetailData;
  backHref: string;
  actions?: React.ReactNode;
}

export function MessageDetail({ message, backHref, actions }: MessageDetailProps) {
  const copy = messagesCopy.detail;
  const isSubjectRtl = isRtlScript(message.subject);
  const isBodyRtl = isRtlScript(message.body);

  return (
    <div className="flex flex-col gap-4 p-6">
      <Link href={backHref} className="text-primary text-sm hover:underline">
        {copy.back}
      </Link>

      <h1 dir="auto" className={`font-bold text-2xl text-foreground ${isSubjectRtl ? "font-body-urdu" : ""}`}>
        {message.subject}
      </h1>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <dt className="font-light text-muted-foreground text-sm">{copy.from}</dt>
          <dd dir="auto" className={isRtlScript(message.name) ? "font-body-urdu" : ""}>
            {message.name}
          </dd>
        </div>
        <div>
          <dt className="font-light text-muted-foreground text-sm">{copy.email}</dt>
          <dd>
            <a
              href={`mailto:${message.email}?subject=${encodeURIComponent(copy.replyPrefix + message.subject)}`}
              className="text-primary hover:underline"
            >
              {message.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-light text-muted-foreground text-sm">{copy.phone}</dt>
          <dd>
            {message.phone ? (
              <span className="flex items-center gap-3">
                <a href={`tel:${message.phone}`} className="text-primary hover:underline">
                  {message.phoneDisplay}
                </a>
                <a
                  href={`https://wa.me/${message.phone.slice(1)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {copy.whatsapp}
                </a>
              </span>
            ) : (
              <span className="text-muted-foreground">{copy.phoneNone}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-light text-muted-foreground text-sm">{copy.received}</dt>
          <dd>{formatAdminDateTime(new Date(message.receivedAt))}</dd>
        </div>
        <div>
          <dt className="font-light text-muted-foreground text-sm">{copy.status}</dt>
          <dd className="flex flex-wrap items-center gap-3">
            <Badge variant={STATUS_VARIANT[message.status]}>{STATUS_LABEL[message.status]}</Badge>
            {actions}
          </dd>
        </div>
      </dl>

      <div
        dir="auto"
        className={`whitespace-pre-wrap [overflow-wrap:anywhere] text-foreground ${isBodyRtl ? "font-body-urdu" : ""}`}
      >
        {message.body}
      </div>
    </div>
  );
}
