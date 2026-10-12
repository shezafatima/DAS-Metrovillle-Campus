import type { PointIconKey } from "@/lib/academics/schema";
import { pointIcons } from "./point-icons";

/** A list of points, each with a round navy icon. `columns={2}` puts it in two columns from `sm`. */
export function IconPoints({
  items,
  columns = 1,
}: {
  items: { id: string; text: string; icon: PointIconKey }[];
  columns?: 1 | 2;
}) {
  return (
    <ul className={`grid gap-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {items.map((item) => {
        const Icon = pointIcons[item.icon];
        return (
          <li key={item.id} className="flex items-center gap-3 font-body text-body text-text">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Icon className="size-5" />
            </span>
            <span>{item.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
