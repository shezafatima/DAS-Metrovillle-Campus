import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { signupsCopy } from "@/content/admin";
import { sourceLabel, type SignupSource } from "@/lib/signup/sources";
import { formatSignupDateTime } from "@/lib/signup/dates";
import type { SignupRow } from "@/lib/signup/admin-queries";

const headers = signupsCopy.table.headers;
const URDU_PATTERN = /[؀-ۿ]/;

export interface SignupsTableProps {
  rows: SignupRow[];
  /** Whether a search/filter is currently applied — picks the right empty-state message. */
  filtered: boolean;
}

export function SignupsTable({ rows, filtered }: SignupsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{headers.name}</TableHead>
              <TableHead>{headers.email}</TableHead>
              <TableHead>{headers.phone}</TableHead>
              <TableHead>{headers.pages}</TableHead>
              <TableHead>{headers.first}</TableHead>
              <TableHead>{headers.latest}</TableHead>
              <TableHead>{headers.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center font-light text-muted-foreground">
                {filtered ? signupsCopy.table.emptyFiltered : signupsCopy.table.empty}
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
            <TableHead>{headers.email}</TableHead>
            <TableHead>{headers.phone}</TableHead>
            <TableHead>{headers.pages}</TableHead>
            <TableHead>{headers.first}</TableHead>
            <TableHead>{headers.latest}</TableHead>
            <TableHead>{headers.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <span
                  dir="auto"
                  className={`font-bold text-foreground ${URDU_PATTERN.test(row.name) ? "font-body-urdu" : ""}`}
                >
                  {row.name}
                </span>
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
                <div className="flex flex-wrap gap-1">
                  {(row.sources as SignupSource[]).map((source) => (
                    <Badge key={source} variant="secondary">
                      {sourceLabel(source)}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatSignupDateTime(new Date(row.firstSignupAt))}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatSignupDateTime(new Date(row.lastSignupAt))}
              </TableCell>
              <TableCell>
                {/* TODO(T042): DeleteSignupDialog */}
                <div />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
