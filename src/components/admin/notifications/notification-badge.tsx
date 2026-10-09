import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/format-count";

export interface NotificationBadgeProps {
  count: number;
  /** True only before the very first fetch resolves (research.md §3, §5). */
  pending?: boolean;
}

/** The one place "dot vs. count vs. nothing" is decided — shared by the bell and both sidebar items. */
export function NotificationBadge({ count, pending }: NotificationBadgeProps) {
  if (pending && count === 0) {
    return <span aria-hidden="true" className="size-2 rounded-full bg-admin-highlight" />;
  }
  if (count <= 0) return null;
  return <Badge variant="highlight">{formatCount(count)}</Badge>;
}
