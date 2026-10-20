import { BookOpen, ClipboardCheck, Compass, GraduationCap, Laptop, NotebookPen, Search, TrendingUp, Users, type LucideIcon } from "lucide-react";
import type { PointIconKey } from "@/lib/academics/schema";

/** Icon keys for the Academics point lists (stored as data) to lucide components. The type checks every key is covered. */
export const pointIcons: Record<PointIconKey, LucideIcon> = {
  compass: Compass,
  users: Users,
  "trending-up": TrendingUp,
  "clipboard-check": ClipboardCheck,
  "book-open": BookOpen,
  laptop: Laptop,
  "graduation-cap": GraduationCap,
  "notebook-pen": NotebookPen,
  search: Search,
};
