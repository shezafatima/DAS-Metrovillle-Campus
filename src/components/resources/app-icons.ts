import { BookA, Calculator, Feather, GraduationCap, MonitorSmartphone, Smartphone, type LucideIcon } from "lucide-react";
import type { AppIconKey } from "@/lib/resources/schema";

/** Icon keys for the app cards (stored as data) to lucide components. The type checks every key is covered. */
export const appIcons: Record<AppIconKey, LucideIcon> = {
  "book-a": BookA,
  calculator: Calculator,
  feather: Feather,
  "monitor-smartphone": MonitorSmartphone,
  "graduation-cap": GraduationCap,
  smartphone: Smartphone,
};
