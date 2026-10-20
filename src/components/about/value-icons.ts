import { Award, BookOpen, Compass, HeartHandshake, Landmark, ShieldCheck, Sprout, Star, Target, Users, type LucideIcon } from "lucide-react";
import type { IconKey } from "@/lib/about/schema";

/** Core value icon keys (stored as data) to lucide components. The type checks every key is covered. */
export const valueIcons: Record<IconKey, LucideIcon> = {
  compass: Compass,
  "shield-check": ShieldCheck,
  target: Target,
  award: Award,
  "heart-handshake": HeartHandshake,
  landmark: Landmark,
  users: Users,
  "book-open": BookOpen,
  star: Star,
  sprout: Sprout,
};
