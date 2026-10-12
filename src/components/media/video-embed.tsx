"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import type { PlayableVideo } from "@/lib/video/embed";

/**
 * The one click-to-load video block (006 FR-010, 018 FR-016 to FR-018), for
 * YouTube and Instagram. It shows a poster and a play button, and loads the
 * provider's player only when the visitor asks, so a page never contacts
 * YouTube or Instagram on load. The poster is local, or a placeholder panel;
 * only the home page passes a remote (YouTube thumbnail) poster.
 */
export function VideoEmbed({
  video,
  title,
  playLabel,
  poster,
  testId,
}: {
  video: PlayableVideo;
  title: string;
  playLabel: string;
  poster: { src: string; remote?: boolean } | null;
  testId?: string;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black" data-testid={testId}>
      {playing ? (
        <iframe
          src={video.embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label={playLabel} className="group absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {poster === null ? (
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-primary">
              <Image src="/images/logo-emblem.svg" alt="" width={160} height={160} className="h-1/2 w-auto" />
            </span>
          ) : poster.remote ? (
            <>
              {/* A plain img: the thumbnail host is YouTube's, not a site image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poster.src} alt="" loading="lazy" className="size-full object-cover" />
            </>
          ) : (
            <Image src={poster.src} alt="" fill sizes="(min-width: 896px) 896px, 100vw" className="object-cover" />
          )}
          <span className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-cta text-white shadow-lg group-hover:bg-cta-hover">
            <Play aria-hidden="true" className="size-7 translate-x-0.5" />
          </span>
        </button>
      )}
    </div>
  );
}
