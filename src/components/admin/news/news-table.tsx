import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { newsCopy } from "@/content/admin";
import { categoryLabel } from "@/lib/news/categories";
import { formatPostDate, toUtcMidnight } from "@/lib/news/dates";
import type { AdminPostRow } from "@/lib/news/admin-queries";
import { DeletePostDialog } from "@/components/admin/news/delete-post-dialog";

const headers = newsCopy.table.headers;

function CoverCell({ row }: { row: AdminPostRow }) {
  if (!row.coverThumbUrl) {
    return <div className="h-10 w-16 rounded bg-neutral-100" aria-hidden="true" />;
  }
  return (
    <Image
      src={row.coverThumbUrl}
      alt=""
      width={64}
      height={40}
      unoptimized
      className="h-10 w-16 rounded object-cover"
    />
  );
}

export function NewsTable({ rows }: { rows: AdminPostRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{headers.cover}</TableHead>
              <TableHead>{headers.title}</TableHead>
              <TableHead>{headers.status}</TableHead>
              <TableHead>{headers.category}</TableHead>
              <TableHead>{headers.date}</TableHead>
              <TableHead>{headers.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center font-light text-muted-foreground">
                {newsCopy.table.empty}
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
            <TableHead>{headers.cover}</TableHead>
            <TableHead>{headers.title}</TableHead>
            <TableHead>{headers.status}</TableHead>
            <TableHead>{headers.category}</TableHead>
            <TableHead>{headers.date}</TableHead>
            <TableHead>{headers.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <CoverCell row={row} />
              </TableCell>
              <TableCell className="max-w-64">
                <Link
                  href={`/admin/news/${row.id}`}
                  title={row.title}
                  dir={row.language === "ur" ? "rtl" : "ltr"}
                  className={`block truncate font-bold text-foreground hover:underline ${row.language === "ur" ? "font-body-urdu" : ""}`}
                >
                  {row.title}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <Badge variant={row.status === "published" ? "default" : "secondary"}>
                    {row.status === "published" ? "Published" : "Draft"}
                  </Badge>
                  {row.isScheduled && (
                    <Badge variant="outline">
                      {newsCopy.table.scheduled} · {formatPostDate(toUtcMidnight(row.publishDate))}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{categoryLabel(row.category)}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatPostDate(toUtcMidnight(row.publishDate))}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/news/${row.id}`}
                    className="font-light text-sm text-primary hover:underline"
                  >
                    {newsCopy.table.edit}
                  </Link>
                  <DeletePostDialog id={row.id} title={row.title} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
