import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRowActions } from "@/components/admin/users/user-row-actions";
import { userStatusLabels, usersCopy } from "@/content/admin";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import { PERMISSION_LABELS } from "@/lib/permissions";
import type { UserListItem, UserStatus } from "@/lib/users/queries";

const headers = usersCopy.table.headers;

const statusVariant: Record<UserStatus, "secondary" | "outline"> = {
  active: "secondary",
  disabled: "outline",
};

/** "All" for a main admin, the granted sections' labels, or "None" (011 contracts/users-ui.md). */
export function sectionsText(user: Pick<UserListItem, "role" | "permissions">): string {
  if (user.role === "main_admin") return usersCopy.table.allSections;
  if (user.permissions.length === 0) return usersCopy.table.noSections;
  return user.permissions.map((key) => PERMISSION_LABELS[key]).join(", ");
}

export function lastLoginText(user: Pick<UserListItem, "lastLoginAt">): string {
  return user.lastLoginAt ? formatAdminDateTime(new Date(user.lastLoginAt)) : usersCopy.table.never;
}

export function StatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={statusVariant[status]}>{userStatusLabels[status]}</Badge>;
}

/** The plain fields the client-side row actions need — no dates, nothing sensitive. */
export function rowUser(user: UserListItem) {
  return { id: user.id, email: user.email, role: user.role, permissions: user.permissions, status: user.status };
}

/** Users list at 768px and up. Below that the page shows UserCards instead (011 FR-035). */
export function UsersTable({ users, currentUserId }: { users: UserListItem[]; currentUserId: string }) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{headers.email}</TableHead>
            <TableHead>{headers.role}</TableHead>
            <TableHead>{headers.sections}</TableHead>
            <TableHead>{headers.status}</TableHead>
            <TableHead>{headers.lastLogin}</TableHead>
            <TableHead>{headers.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center font-light text-muted-foreground">
                {usersCopy.table.empty}
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <TableRow key={user.id} data-testid="user-row">
                  <TableCell className="whitespace-normal break-all font-bold">
                    {user.email}
                    {isSelf && <span className="ml-1 font-light text-muted-foreground">{usersCopy.you}</span>}
                  </TableCell>
                  <TableCell>{usersCopy.roles[user.role]}</TableCell>
                  <TableCell className="whitespace-normal">{sectionsText(user)}</TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{lastLoginText(user)}</TableCell>
                  <TableCell className="whitespace-normal">
                    <UserRowActions user={rowUser(user)} isSelf={isSelf} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
