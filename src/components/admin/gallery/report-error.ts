"use client";

import { toast } from "@/components/ui/toaster";
import { galleryCopy } from "@/content/admin";
import type { GalleryResult } from "@/lib/gallery/types";

type GalleryError = Extract<GalleryResult<unknown>, { status: "error" }>;

/** The toast for a refused gallery action. `full` is handled by the caller (its message depends on what is full). */
export function reportGalleryError(result: GalleryError, fullMessage: string = galleryCopy.albumFull): void {
  const t = galleryCopy.toasts;
  const title =
    result.error === "full"
      ? fullMessage
      : result.error === "conflict"
        ? t.conflict
        : result.error === "not_found"
          ? t.notFound
          : result.error === "invalid"
            ? t.invalid
            : result.error === "forbidden"
              ? t.forbidden
              : result.error === "unauthorized"
                ? t.unauthorized
                : t.unavailable;
  toast({ title, type: "error" });
}
