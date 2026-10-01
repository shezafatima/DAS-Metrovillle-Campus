/**
 * The only place that reads a YouTube address (005 FR-019). The Settings
 * schema uses it to accept or refuse the admin's input, and the home page
 * (006) reuses it to get the embed id, which is derived and never stored.
 *
 * Accepted: watch pages, youtu.be links, embed links and Shorts links on
 * youtube.com, www.youtube.com, m.youtube.com and youtu.be, with or without
 * the scheme. Anything else (other hosts, channels, playlists, look-alike
 * hosts such as youtube.com.evil.com) is refused.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

export function parseYouTubeAddress(text: string): { id: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);
  let id: string | null | undefined;

  if (host === "youtu.be") {
    id = segments[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (segments[0] === "watch" && segments.length === 1) id = url.searchParams.get("v");
    else if ((segments[0] === "embed" || segments[0] === "shorts") && segments.length === 2) id = segments[1];
  }

  return id && VIDEO_ID.test(id) ? { id } : null;
}
