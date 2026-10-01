"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { addGalleryPhotos } from "@/app/admin/(dashboard)/settings/gallery/actions";
import { SETTINGS_SIGN_ENDPOINT } from "@/components/admin/settings/image-field";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { galleryCopy } from "@/content/admin";
import type { AdminAlbum, ImageRef } from "@/lib/gallery/types";
import { requestSignature, uploadToCloudinary } from "@/lib/uploads/direct-upload";
import { precheckImage } from "@/lib/uploads/image-limits";
import { reportGalleryError } from "./report-error";

const PARALLEL_UPLOADS = 3;

interface Entry {
  key: number;
  name: string;
  status: "uploading" | "failed";
  reason?: string;
}

export interface AlbumUploaderProps {
  album: AdminAlbum;
  onAdded: (album: AdminAlbum) => void;
}

/**
 * Multi-file photo upload into one album (007 US2, research R7). Files are
 * checked in the browser and at most the album's remaining room is taken,
 * in the order chosen; each is signed and uploaded straight to Cloudinary,
 * three at a time, so one bad file never blocks the others. When all have
 * settled, ONE `addGalleryPhotos` call sends the uploaded ones in selection
 * order; the server re-checks the room (another admin may have added photos
 * meanwhile), keeps what fits and deletes the rest.
 */
export function AlbumUploader({ album, onAdded }: AlbumUploaderProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef(0);

  const room = Math.max(0, album.maxPhotos - album.photoCount);

  const patch = (key: number, change: Partial<Entry>) =>
    setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, ...change } : entry)));

  async function uploadOne(file: File, key: number): Promise<ImageRef | null> {
    const problem = await precheckImage(file);
    if (problem) {
      patch(key, { status: "failed", reason: galleryCopy.errors.imageLimits });
      return null;
    }
    try {
      const signed = await requestSignature(SETTINGS_SIGN_ENDPOINT, "gallery");
      const uploaded = await uploadToCloudinary(file, signed);
      return { url: uploaded.secure_url, publicId: uploaded.public_id, width: uploaded.width, height: uploaded.height };
    } catch {
      patch(key, { status: "failed", reason: galleryCopy.toasts.unavailable });
      return null;
    }
  }

  async function handleFiles(selected: File[]) {
    if (selected.length === 0 || busy) return;
    setNotice(null);
    const files = selected.slice(0, room);
    const refusedForSpace = selected.length - files.length;

    const queued = files.map((file) => ({ file, key: (keyRef.current += 1) }));
    setEntries(queued.map(({ file, key }) => ({ key, name: file.name, status: "uploading" as const })));
    setBusy(true);

    // Upload with a small pool, but keep the results in selection order.
    const results: (ImageRef | null)[] = new Array(queued.length).fill(null);
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL_UPLOADS, queued.length) }, async () => {
        while (next < queued.length) {
          const i = next;
          next += 1;
          results[i] = await uploadOne(queued[i].file, queued[i].key);
        }
      }),
    );

    const uploaded = results.map((image, i) => ({ image, key: queued[i].key })).filter((r): r is { image: ImageRef; key: number } => r.image !== null);
    let added = 0;
    let refusedFull = refusedForSpace;

    if (uploaded.length > 0) {
      const result = await addGalleryPhotos({ albumId: album.id, photos: uploaded.map(({ image }) => ({ image })) });
      if (result.status === "success") {
        added = result.data.added;
        refusedFull += result.data.refusedFull;
        for (const { index } of result.data.rejected) patch(uploaded[index].key, { status: "failed", reason: galleryCopy.errors.imageLimits });
        onAdded(result.data.album);
      } else if (result.status === "error" && result.error === "full") {
        refusedFull += uploaded.length;
      } else {
        reportGalleryError(result, galleryCopy.photosFull);
      }
    }

    // Finished uploads leave the progress list; failures stay with their reason.
    setEntries((current) => current.filter((entry) => entry.status === "failed"));
    setBusy(false);

    const summary = galleryCopy.addedSummary(added, refusedFull);
    if (summary) {
      setNotice(summary);
      toast({ title: summary, type: refusedFull > 0 && added === 0 ? "error" : "success" });
    }
  }

  return (
    <div className="flex flex-col gap-2" data-testid="album-uploader">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="album-photo-input"
          disabled={room === 0 || busy}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void handleFiles(files);
          }}
        />
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={room === 0 || busy}>
          {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Upload aria-hidden="true" />}
          {galleryCopy.uploadPhotos}
        </Button>
        <span className="font-light text-muted-foreground text-sm" data-testid="album-room">
          {room === 0 ? galleryCopy.photosFull : galleryCopy.room(room)}
        </span>
      </div>

      <p aria-live="polite" className="font-light text-foreground text-sm" data-testid="album-upload-notice">
        {notice}
      </p>

      {entries.length > 0 && (
        <ul className="flex flex-col gap-1" data-testid="album-upload-entries">
          {entries.map((entry) => (
            <li key={entry.key} className="flex items-center gap-2 font-light text-sm">
              {entry.status === "uploading" ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  <span className="break-all">{galleryCopy.uploading(entry.name)}</span>
                </>
              ) : (
                <>
                  <span role="alert" className="break-all text-destructive">
                    {galleryCopy.uploadFailed(entry.name, entry.reason ?? "")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${galleryCopy.dismiss}: ${entry.name}`}
                    onClick={() => setEntries((current) => current.filter((e) => e.key !== entry.key))}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
