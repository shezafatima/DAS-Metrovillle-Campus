import { FaFacebookF, FaYoutube, FaInstagram, FaTiktok } from "react-icons/fa6";
import type { IconType } from "react-icons";
import { cn } from "cn";
import type { ContactInfo, SocialPlatform } from "@/content/site-shell";

const SOCIAL_ORDER: SocialPlatform[] = ["facebook", "youtube", "instagram", "tiktok"];

const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
};

// Real brand marks (per user request) — react-icons/fa6 ships the exact
// glyphs the reference site's badges use.
const SOCIAL_ICONS: Record<SocialPlatform, IconType> = {
  facebook: FaFacebookF,
  youtube: FaYoutube,
  instagram: FaInstagram,
  tiktok: FaTiktok,
};

interface SocialLinksProps {
  social: ContactInfo["social"];
  className?: string;
}

// The one place that reads ContactInfo.social and renders it as icon links
// (FR-012, FR-013): a platform with no configured URL is omitted entirely,
// never a dead link. The badges keep the old top bar's rounded-square shape;
// on the footer's white they are the theme yellow with a navy icon.
export function SocialLinks({ social, className }: SocialLinksProps) {
  // Fixed order (Facebook, YouTube, Instagram, TikTok — the reference's), not
  // the order the values happen to arrive in: Settings (005) stores them as a
  // plain object, and a cleared platform must leave the rest where they were.
  const entries = SOCIAL_ORDER.flatMap((platform): [SocialPlatform, string][] => {
    const url = social[platform];
    return url ? [[platform, url]] : [];
  });

  if (entries.length === 0) return null;

  return (
    <ul className={cn("flex items-center gap-2", className)}>
      {entries.map(([platform, url]) => {
        const Icon = SOCIAL_ICONS[platform];
        return (
          <li key={platform}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-md bg-(--color-topbar) p-1.5 text-primary transition-opacity duration-(--motion-fast) hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary)"
            >
              <Icon aria-hidden="true" className="size-4" />
              <span className="sr-only">{SOCIAL_LABELS[platform]}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
