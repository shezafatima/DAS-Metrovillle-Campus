import { parseYouTubeAddress } from "@/lib/settings/youtube";

/**
 * One place that turns a stored video address into an embed URL (018 R3). The
 * Academics schemas use it to accept or refuse an address, and `VideoEmbed`
 * renders only what it returns. Embed URLs are built from the parsed id or
 * code, never from the raw input.
 */

export type VideoProvider = "youtube" | "instagram";
export type PlayableVideo = { provider: VideoProvider; embedUrl: string };

const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);
const INSTAGRAM_CODE = /^[A-Za-z0-9_-]{5,64}$/;

export function parseInstagramAddress(input: string): { kind: "p" | "reel"; code: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (!INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2) return null;
  const [type, code] = segments;
  if (!INSTAGRAM_CODE.test(code)) return null;
  if (type === "p" || type === "tv") return { kind: "p", code };
  if (type === "reel" || type === "reels") return { kind: "reel", code };
  return null;
}

export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}

export function resolveVideo(entry: { provider: VideoProvider; url: string }): PlayableVideo | null {
  if (entry.provider === "youtube") {
    const parsed = parseYouTubeAddress(entry.url);
    return parsed ? { provider: "youtube", embedUrl: youTubeEmbedUrl(parsed.id) } : null;
  }
  const parsed = parseInstagramAddress(entry.url);
  return parsed ? { provider: "instagram", embedUrl: `https://www.instagram.com/${parsed.kind}/${parsed.code}/embed/` } : null;
}
