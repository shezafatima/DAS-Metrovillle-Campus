import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { messagesCopy } from "@/content/admin";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import { isRtlScript } from "@/lib/rtl-text";
import type { MessageRow } from "@/lib/messages/admin-queries";
import { DeleteMessageDialog } from "@/components/admin/messages/delete-message-dialog";

const headers = messagesCopy.table.headers;

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

export interface MessagesTableProps {
  rows: MessageRow[];
  filtered: boolean;
  from: string;
}

export function MessagesTable({ rows, filtered, from }: MessagesTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{headers.name}</TableHead>
              <TableHead>{headers.subject}</TableHead>
              <TableHead>{headers.preview}</TableHead>
              <TableHead>{headers.status}</TableHead>
              <TableHead>{headers.received}</TableHead>
              <TableHead>{headers.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center font-light text-muted-foreground">
                {filtered ? messagesCopy.table.emptyFiltered : messagesCopy.table.empty}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{headers.name}</TableHead>
            <TableHead>{headers.subject}</TableHead>
            <TableHead>{headers.preview}</TableHead>
            <TableHead>{headers.status}</TableHead>
            <TableHead>{headers.received}</TableHead>
            <TableHead>{headers.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const href = `/admin/messages/${row.id}${from ? `?from=${encodeURIComponent(from)}` : ""}`;
            const isNew = row.status === "new";
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={href}
                    dir="auto"
                    className={`text-primary hover:underline ${isRtlScript(row.name) ? "font-body-urdu" : ""} ${isNew ? "font-bold" : ""}`}
                  >
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={href}
                    dir="auto"
                    className={`text-primary hover:underline ${isRtlScript(row.subject) ? "font-body-urdu" : ""} ${isNew ? "font-bold" : ""}`}
                  >
                    {row.subject}
                  </Link>
                </TableCell>
                <TableCell className="min-w-0 w-full">
                  <span dir="auto" className="block truncate text-muted-foreground">
                    {row.preview}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatAdminDateTime(new Date(row.receivedAt))}</TableCell>
                <TableCell>
                  <DeleteMessageDialog id={row.id} subject={row.subject} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
