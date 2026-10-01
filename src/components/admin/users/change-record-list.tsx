import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { changeRecordCopy } from "@/content/admin";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import { describeUserChange } from "@/lib/users/change-text";
import type { UserChangeItem } from "@/lib/users/queries";

const headers = changeRecordCopy.headers;

/**
 * The change record, newest first (011 FR-032). A table from 768px, stacked
 * cards below so nothing scrolls sideways at 375px. Read-only: nothing on
 * this screen edits or deletes an entry (FR-031).
 */
export function ChangeRecordList({ items }: { items: UserChangeItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-border py-10 text-center font-light text-muted-foreground">
        {changeRecordCopy.empty}
      </p>
    );
  }

  return (
    <>
      <div className="hidden rounded-lg border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{headers.when}</TableHead>
              <TableHead>{headers.by}</TableHead>
              <TableHead>{headers.user}</TableHead>
              <TableHead>{headers.change}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} data-testid="change-row">
                <TableCell className="whitespace-nowrap">{formatAdminDateTime(new Date(item.at))}</TableCell>
                <TableCell className="whitespace-normal break-all">{item.actorEmail}</TableCell>
                <TableCell className="whitespace-normal break-all">{item.targetEmail}</TableCell>
                <TableCell className="whitespace-normal">{describeUserChange(item)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {items.map((item) => (
          <li key={item.id} data-testid="change-card" className="flex flex-col gap-1 rounded-lg border border-border p-4 text-sm">
            <p className="font-bold text-foreground">{describeUserChange(item)}</p>
            <p className="break-all text-muted-foreground">
              {headers.user}: {item.targetEmail}
            </p>
            <p className="break-all text-muted-foreground">
              {headers.by}: {item.actorEmail}
            </p>
            <p className="text-muted-foreground">{formatAdminDateTime(new Date(item.at))}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
