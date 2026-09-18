import { FaFacebookF, FaYoutube, FaInstagram, FaTiktok } from "react-icons/fa6";
import type { IconType } from "react-icons";
import { cn } from "cn";
import type { ContactInfo, SocialPlatform } from "@/content/site-shell";

const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
};

// Real brand marks (per user request) — react-icons/fa6 ships the exact
// glyphs the reference site's top-bar badges use.
const SOCIAL_ICONS: Record<SocialPlatform, IconType> = {
  facebook: FaFacebookF,
  youtube: FaYoutube,
  instagram: FaInstagram,
  tiktok: FaTiktok,
};

interface SocialLinksProps {
  social: ContactInfo["social"];
  /** "light" (white badge on a dark/yellow bar, e.g. the top bar) or "dark"
   * (dark badge on a light bar, e.g. the footer bottom bar) — matches the
   * reference's two different social-icon treatments. */
  variant?: "light" | "dark";
  className?: string;
}

// Reusable across TopBar and Footer — the one place that reads
// ContactInfo.social and renders it as icon links (FR-012, FR-013): a
// platform with no configured URL is omitted entirely, never a dead link.
export function SocialLinks({
  social,
  variant = "light",
  className,
}: SocialLinksProps) {
  const entries = (
    Object.entries(social) as [SocialPlatform, string | undefined][]
  ).filter((entry): entry is [SocialPlatform, string] => Boolean(entry[1]));

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
              className={cn(
                "flex items-center justify-center transition-opacity duration-(--motion-fast) hover:opacity-75",
                variant === "light"
                  ? "rounded-md bg-surface p-1.5 text-primary"
                  : "rounded-full bg-text p-1 text-surface"
              )}
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
