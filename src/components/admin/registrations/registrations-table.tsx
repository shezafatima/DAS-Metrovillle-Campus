import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { registrationsAdminCopy } from "@/content/admin";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import type { RegistrationRow } from "@/lib/registration/admin-queries";
import { isRtlScript } from "@/lib/rtl-text";

const headers = registrationsAdminCopy.table.headers;

export interface RegistrationsTableProps {
  rows: RegistrationRow[];
  /** Whether a search or class filter is applied: picks the right empty-state message. */
  filtered: boolean;
}

const nameClass = (text: string) => (isRtlScript(text) ? "font-body-urdu" : "");

/** The Registrations list (newest first, as the query returns it). Names may be Urdu. No health or address data. */
export function RegistrationsTable({ rows, filtered }: RegistrationsTableProps) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{headers.reference}</TableHead>
            <TableHead>{headers.student}</TableHead>
            <TableHead>{headers.className}</TableHead>
            <TableHead>{headers.father}</TableHead>
            <TableHead>{headers.mobile}</TableHead>
            <TableHead>{headers.submitted}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center font-light text-muted-foreground">
                {filtered ? registrationsAdminCopy.table.emptyFiltered : registrationsAdminCopy.table.empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} data-testid="registration-row">
                <TableCell className="font-mono text-sm">{row.reference}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/registrations/${row.id}`} dir="auto" className={`font-bold text-primary hover:underline ${nameClass(row.studentName)}`}>
                      {row.studentName}
                    </Link>
                    {row.likelyDuplicate && <Badge variant="highlight">{registrationsAdminCopy.table.duplicate}</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <span dir="auto">{row.className}</span>
                </TableCell>
                <TableCell>
                  <span dir="auto" className={nameClass(row.fatherName)}>
                    {row.fatherName}
                  </span>
                </TableCell>
                <TableCell>
                  {row.mobile ? (
                    <a href={`tel:${row.mobile}`} className="text-primary hover:underline">
                      {row.mobileDisplay}
                    </a>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatAdminDateTime(new Date(row.submittedAt))}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
