"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Form, FormControl, FormDescription, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toaster";

interface DemoRow {
  id: string;
  title: string;
  status: "draft" | "published";
  date: string;
}

const SEED_ROWS: DemoRow[] = [
  { id: "1", title: "Admission open for 2027 intake", status: "published", date: "2026-09-01" },
  { id: "2", title: "Winter break schedule", status: "draft", date: "2026-09-10" },
  { id: "3", title: "Parent-teacher meeting", status: "published", date: "2026-08-20" },
];

type SortKey = keyof Pick<DemoRow, "title" | "status" | "date">;

function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-bold text-2xl text-foreground">{title}</h1>
      {action}
    </div>
  );
}

function SortableHead({
  column,
  onSort,
  children,
}: {
  column: SortKey;
  onSort: (column: SortKey) => void;
  children: React.ReactNode;
}) {
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
        <ArrowUpDown className="size-3" aria-hidden="true" />
      </button>
    </TableHead>
  );
}

function DataTableDemo() {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);

  const rows = useMemo(() => {
    if (empty) return [];
    return [...SEED_ROWS].sort((a, b) => {
      const cmp = a[sortKey].localeCompare(b[sortKey]);
      return sortAsc ? cmp : -cmp;
    });
  }, [sortKey, sortAsc, empty]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-foreground">Data table</h2>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setLoading((v) => !v)}>
            {loading ? "Show data" : "Show loading state"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setEmpty((v) => !v)}>
            {empty ? "Show data" : "Show empty state"}
          </Button>
        </div>
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead column="title" onSort={toggleSort}>Title</SortableHead>
              <SortableHead column="status" onSort={toggleSort}>Status</SortableHead>
              <SortableHead column="date" onSort={toggleSort}>Date</SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center font-light text-muted-foreground">
                  No items yet.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-bold text-foreground">{row.title}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "published" ? "default" : "secondary"}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.date}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function FormDemo() {
  const [submitted, setSubmitted] = useState<string | null>(null);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold text-lg text-foreground">Form layout</h2>
      <Form
        className="flex max-w-sm flex-col gap-4 rounded-lg border border-border p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setSubmitted(String(data.get("title") ?? ""));
          toast({ title: "Saved", description: "The form was saved.", type: "success" });
        }}
      >
        <FormField name="title">
          <FormLabel>Title</FormLabel>
          <FormControl required placeholder="e.g. Winter break notice" />
          <FormDescription>Shown on the public news list.</FormDescription>
          <FormMessage />
        </FormField>

        <FormField name="email">
          <FormLabel>Contact email</FormLabel>
          <FormControl required type="email" placeholder="name@example.com" />
          <FormMessage />
        </FormField>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit">Save</Button>
          <Button type="button" variant="outline" onClick={() => setSubmitted(null)}>
            Cancel
          </Button>
        </div>
        {submitted && <p className="font-light text-sm text-muted-foreground">Saved: {submitted}</p>}
      </Form>
    </section>
  );
}

function ButtonsDemo() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold text-lg text-foreground">Buttons</h2>
      <div className="flex flex-wrap gap-2">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
        <Button disabled>Disabled</Button>
      </div>
    </section>
  );
}

function BadgesDemo() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold text-lg text-foreground">Status badges</h2>
      <div className="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Draft</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Error</Badge>
        <Badge variant="highlight">3 new</Badge>
      </div>
    </section>
  );
}

function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold text-lg text-foreground">Modal</h2>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline">Open modal</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick edit</DialogTitle>
            <DialogDescription>An example modal with a form inside.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Item name" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                toast({ title: "Saved", type: "success" });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ConfirmationDemo() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold text-lg text-foreground">Confirmation dialog</h2>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="destructive">
              <Trash2 className="size-4" aria-hidden="true" />
              Delete item
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This can be undone later from the trash — nothing is permanently deleted (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toast({ title: "Deleted", description: "The item was moved to trash.", type: "error" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function ToastDemo() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold text-lg text-foreground">Toasts</h2>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => toast({ title: "Saved successfully", type: "success" })}
        >
          Trigger success toast
        </Button>
        <Button
          variant="outline"
          onClick={() => toast({ title: "Something went wrong", description: "Please try again.", type: "error" })}
        >
          Trigger error toast
        </Button>
      </div>
    </section>
  );
}

export function DesignSystemDemo() {
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-col gap-8 p-6">
      <PageHeader
        title="Design system (temporary)"
        action={
          <Button
            onClick={() => {
              setSaving(true);
              setTimeout(() => {
                setSaving(false);
                toast({ title: "New item created", type: "success" });
              }, 800);
            }}
            disabled={saving}
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
            New item
          </Button>
        }
      />
      <p className="font-light text-sm text-muted-foreground">
        One real example of each shared pattern later admin pages (003 news, 007
        messages, 012 applications) reuse. Unlinked from the sidebar — reachable only by URL. Delete once those
        features have their own real pages.
      </p>

      <Separator />
      <DataTableDemo />
      <Separator />
      <FormDemo />
      <Separator />
      <ButtonsDemo />
      <Separator />
      <BadgesDemo />
      <Separator />
      <ModalDemo />
      <Separator />
      <ConfirmationDemo />
      <Separator />
      <ToastDemo />
    </div>
  );
}
