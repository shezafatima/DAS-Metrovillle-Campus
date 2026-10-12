import Image from "next/image";
import { UserRound } from "lucide-react";
import type { ImageRef } from "@/lib/settings/types";

/** Stand-in for a missing photo: a plain silhouette, never a real person. */
export function PersonPlaceholder({ onMuted = false }: { onMuted?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-full w-full items-center justify-center ${onMuted ? "bg-surface" : "bg-(--color-home-muted-band)"}`}
    >
      <UserRound aria-hidden="true" focusable="false" className="size-1/3 text-text-muted" />
    </div>
  );
}

/** A fixed-ratio, rounded photo frame, shared by the team cards and the messages. `onMuted` is for a muted section background, so the placeholder does not vanish into it. */
export function PersonPhoto({ photo, name, onMuted = false }: { photo: ImageRef | null; name: string; onMuted?: boolean }) {
  return (
    <div className="relative aspect-about-person w-full overflow-hidden rounded-xl">
      {photo ? (
        <Image
          src={photo.url}
          alt={name}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      ) : (
        <PersonPlaceholder onMuted={onMuted} />
      )}
    </div>
  );
}
