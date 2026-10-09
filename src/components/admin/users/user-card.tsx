import { UserRowActions } from "@/components/admin/users/user-row-actions";
import { StatusBadge, lastLoginText, rowUser, sectionsText } from "@/components/admin/users/users-table";
import { usersCopy } from "@/content/admin";
import type { UserListItem } from "@/lib/users/queries";

const headers = usersCopy.table.headers;

/** Stacked cards for widths under 768px, where the table would scroll sideways (011 FR-035). */
export function UserCards({ users, currentUserId }: { users: UserListItem[]; currentUserId: string }) {
  if (users.length === 0) {
    return (
      <p className="rounded-lg border border-border py-10 text-center font-light text-muted-foreground">
        {usersCopy.table.empty}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {users.map((user) => {
        const isSelf = user.id === currentUserId;
        return (
          <li key={user.id} data-testid="user-card" className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 break-all font-bold text-foreground">
                {user.email}
                {isSelf && <span className="ml-1 font-light text-muted-foreground">{usersCopy.you}</span>}
              </p>
              <StatusBadge status={user.status} />
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">{headers.role}</dt>
              <dd>{usersCopy.roles[user.role]}</dd>
              <dt className="text-muted-foreground">{headers.sections}</dt>
              <dd>{sectionsText(user)}</dd>
              <dt className="text-muted-foreground">{headers.lastLogin}</dt>
              <dd>{lastLoginText(user)}</dd>
            </dl>
            <UserRowActions user={rowUser(user)} isSelf={isSelf} />
          </li>
        );
      })}
    </ul>
  );
}
