"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * Click-to-load YouTube video (006 FR-010): shows the video's thumbnail and a
 * play button, and loads the privacy-enhanced (youtube-nocookie) player only
 * when the visitor asks, so the home page doesn't pull in YouTube's scripts
 * on every visit.
 */
export function YouTubeEmbed({ id, title, playLabel }: { id: string; title: string; playLabel: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black" data-testid="why-choose-video">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label={playLabel} className="group absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {/* A plain img: the thumbnail host is YouTube's, not a site image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover" />
          <span className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-cta text-white shadow-lg group-hover:bg-cta-hover">
            <Play aria-hidden="true" className="size-7 translate-x-0.5" />
          </span>
        </button>
      )}
    </div>
  );
}
