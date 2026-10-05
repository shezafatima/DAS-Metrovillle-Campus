import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { careersAdminCopy } from "@/content/admin";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import { isRtlScript } from "@/lib/rtl-text";
import type { CareerApplicationRow } from "@/lib/careers/admin-queries";

const headers = careersAdminCopy.table.headers;

export interface ApplicationsTableProps {
  rows: CareerApplicationRow[];
  /** Whether a search is currently applied: picks the right empty-state message. */
  filtered: boolean;
}

/** The Applications list (newest first, as the query returns it). Names and qualifications may be Urdu. */
export function ApplicationsTable({ rows, filtered }: ApplicationsTableProps) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{headers.name}</TableHead>
            <TableHead>{headers.email}</TableHead>
            <TableHead>{headers.phone}</TableHead>
            <TableHead>{headers.qualification}</TableHead>
            <TableHead>{headers.applied}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center font-light text-muted-foreground">
                {filtered ? careersAdminCopy.table.emptyFiltered : careersAdminCopy.table.empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} data-testid="application-row">
                <TableCell>
                  <Link
                    href={`/admin/careers/${row.id}`}
                    dir="auto"
                    className={`font-bold text-primary hover:underline ${isRtlScript(row.name) ? "font-body-urdu" : ""}`}
                  >
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <a href={`mailto:${row.email}`} className="text-primary hover:underline">
                    {row.email}
                  </a>
                </TableCell>
                <TableCell>
                  <a href={`tel:${row.phone}`} className="text-primary hover:underline">
                    {row.phoneDisplay}
                  </a>
                </TableCell>
                <TableCell>
                  <span dir="auto" className={isRtlScript(row.qualification) ? "font-body-urdu" : ""}>
                    {row.qualification}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatAdminDateTime(new Date(row.appliedAt))}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
