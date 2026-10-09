"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { galleryContent } from "@/content/gallery";
import type { PublicPhoto } from "@/lib/gallery/types";
import { cn } from "cn";
import { GalleryImage } from "./gallery-image";

/** A horizontal move longer than this, and mostly horizontal, is a swipe. */
export const SWIPE_MIN_PX = 50;

export interface PhotoViewerProps {
  title: string;
  photos: PublicPhoto[];
  /** The open photo, or null when the viewer is closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Where focus goes back to when the viewer closes (the photo that opened it). */
  returnFocus?: React.RefObject<HTMLElement | null>;
}

/**
 * Full-screen photo viewer for an album page (007 FR-029, FR-030), named by
 * its visible title (the album title). Built on
 * the shared Dialog: focus stays inside while it is open and Escape closes it.
 * ← / → and the Previous / Next buttons move (no wrap-around: the buttons are
 * hidden at the ends); a horizontal swipe moves on touch screens. Only the
 * open photo and its neighbours are loaded. The Dialog's own transitions
 * are motion-safe only.
 */
export function PhotoViewer({ title, photos, index, onIndexChange, onClose, returnFocus }: PhotoViewerProps) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const open = index !== null && photos.length > 0;
  const current = open ? Math.min(Math.max(index, 0), photos.length - 1) : 0;
  const photo = photos[current];
  const hasPrev = current > 0;
  const hasNext = current < photos.length - 1;

  const go = (to: number) => {
    if (to >= 0 && to < photos.length) onIndexChange(to);
  };

  const altFor = (p: PublicPhoto, n: number) => p.caption || galleryContent.photoAlt(title, n + 1);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showClose={false}
        finalFocus={returnFocus}
        data-testid="photo-viewer"
        className="h-[100dvh] max-h-none w-screen max-w-none gap-3 rounded-none border-0 bg-black/95 p-3 text-white sm:p-6"
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            go(current + 1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            go(current - 1);
          }
        }}
        onPointerDown={(event: React.PointerEvent) => {
          start.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event: React.PointerEvent) => {
          const from = start.current;
          start.current = null;
          if (!from) return;
          const dx = event.clientX - from.x;
          const dy = event.clientY - from.y;
          // At least 50 px sideways and less than 45° off horizontal.
          if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? current + 1 : current - 1);
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <DialogTitle dir="auto" className="min-w-0 truncate font-bold font-heading text-base text-white">
            {title}
          </DialogTitle>
          <span className="shrink-0 font-body text-sm text-white/80" data-testid="viewer-position">
            {open ? galleryContent.viewer.position(current + 1, photos.length) : ""}
          </span>
          <DialogClose
            className="shrink-0 rounded-sm p-1 text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={galleryContent.viewer.close}
          >
            <X className="size-6" />
          </DialogClose>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center">
          {hasPrev && (
            <button
              type="button"
              aria-label={galleryContent.viewer.previous}
              className="absolute left-0 z-10 rounded-full bg-black/60 p-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={() => go(current - 1)}
            >
              <ChevronLeft className="size-6" />
            </button>
          )}
          <div className="relative h-full w-full">
            {open &&
              photos.map((p, n) =>
                // Only the open photo and its neighbours are mounted, so nothing else is fetched.
                Math.abs(n - current) <= 1 ? (
                  <div key={p.id} className={cn("absolute inset-0", n === current ? "block" : "hidden")} aria-hidden={n !== current}>
                    <GalleryImage image={p.image} alt={altFor(p, n)} sizes="100vw" className="object-contain" priority={n === current} />
                  </div>
                ) : null,
              )}
          </div>
          {hasNext && (
            <button
              type="button"
              aria-label={galleryContent.viewer.next}
              className="absolute right-0 z-10 rounded-full bg-black/60 p-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={() => go(current + 1)}
            >
              <ChevronRight className="size-6" />
            </button>
          )}
        </div>

        {photo?.caption && (
          <p dir="auto" className="break-words text-center font-body text-sm text-white" data-testid="viewer-caption">
            {photo.caption}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
