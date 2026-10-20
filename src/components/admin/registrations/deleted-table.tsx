import { RestoreRegistrationButton } from "@/components/admin/registrations/restore-registration-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { registrationsAdminCopy } from "@/content/admin";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import type { DeletedRegistrationRow } from "@/lib/registration/admin-queries";
import { isRtlScript } from "@/lib/rtl-text";

const copy = registrationsAdminCopy.deleted;

/** The Deleted view: deleted within the last 30 days, with days left and Restore. */
export function DeletedTable({ rows }: { rows: DeletedRegistrationRow[] }) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{copy.headers.reference}</TableHead>
            <TableHead>{copy.headers.student}</TableHead>
            <TableHead>{copy.headers.className}</TableHead>
            <TableHead>{copy.headers.deletedOn}</TableHead>
            <TableHead>{copy.headers.daysLeft}</TableHead>
            <TableHead>{copy.headers.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center font-light text-muted-foreground">
                {copy.empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} data-testid="deleted-registration-row">
                <TableCell className="font-mono text-sm">{row.reference}</TableCell>
                <TableCell>
                  <span dir="auto" className={isRtlScript(row.studentName) ? "font-body-urdu" : ""}>
                    {row.studentName}
                  </span>
                </TableCell>
                <TableCell>
                  <span dir="auto">{row.className}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatAdminDateTime(new Date(row.deletedAt))}</TableCell>
                <TableCell data-testid="days-left">{copy.daysLeft(row.daysLeft)}</TableCell>
                <TableCell>
                  <RestoreRegistrationButton id={row.id} reference={row.reference} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
