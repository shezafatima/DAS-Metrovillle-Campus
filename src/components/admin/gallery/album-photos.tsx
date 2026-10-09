"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { deleteGalleryPhoto, reorderGalleryPhotos, setGalleryCover, updateGalleryPhoto } from "@/app/admin/(dashboard)/settings/gallery/actions";
import { AdminConfirmDeleteDialog } from "@/components/admin/admin-delete-dialog";
import { ImagePreview } from "@/components/admin/settings/image-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { galleryCopy } from "@/content/admin";
import { formatAlbumDate } from "@/content/gallery";
import { moveId } from "@/lib/gallery/rules";
import { CAPTION_MAX, type AdminAlbum, type AdminGallery, type AdminPhoto } from "@/lib/gallery/types";
import { AlbumPanel } from "./album-panel";
import { AlbumUploader } from "./album-uploader";
import { reportGalleryError } from "./report-error";
import { useReorder } from "./use-reorder";

/**
 * One album's photos (007 US2): upload, caption, reorder, choose the cover
 * and delete. Every action saves at once and the album is replaced by what
 * the server returns.
 */
export function AlbumPhotos({ initial }: { initial: AdminAlbum }) {
  const [album, setAlbum] = useState(initial);
  const [announcement, setAnnouncement] = useState("");
  const photos = album.photos;

  async function move(from: number, to: number) {
    const ids = moveId(photos.map((photo) => photo.id), from, to);
    if (ids.every((id, i) => id === photos[i].id)) return;
    const previous = album;
    const byId = new Map(photos.map((photo) => [photo.id, photo]));
    setAlbum({ ...album, photos: ids.map((id) => byId.get(id)!) });
    const result = await reorderGalleryPhotos({ albumId: album.id, photoIds: ids });
    if (result.status === "success") {
      setAlbum(result.data);
      setAnnouncement(galleryCopy.moved(galleryCopy.photoName(from + 1), to + 1, photos.length));
      toast({ title: galleryCopy.toasts.photosReordered, type: "success" });
    } else {
      setAlbum(previous);
      reportGalleryError(result);
    }
  }

  const { itemProps, handleProps } = useReorder((from, to) => void move(from, to));

  async function apply(result: Awaited<ReturnType<typeof setGalleryCover>>, message: string) {
    if (result.status === "success") {
      setAlbum(result.data);
      toast({ title: message, type: "success" });
    } else {
      reportGalleryError(result);
    }
  }

  function onDetailsSaved(gallery: AdminGallery) {
    const updated = gallery.albums.find((entry) => entry.id === album.id);
    if (updated) setAlbum(updated);
  }

  return (
    <div className="flex flex-col gap-4" data-testid="album-photos">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 dir="auto" className="break-words font-bold text-foreground text-lg" data-testid="album-heading">
            {album.title}
          </h2>
          <AlbumPanel album={album} onSaved={onDetailsSaved} triggerLabel={galleryCopy.editDetails} triggerSize="sm" />
        </div>
        {album.description && (
          <p dir="auto" className="break-words font-light text-muted-foreground text-sm">
            {album.description}
          </p>
        )}
        {album.date && <p className="font-light text-muted-foreground text-xs">{formatAlbumDate(album.date)}</p>}
      </div>

      <AlbumUploader album={album} onAdded={setAlbum} />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {photos.length === 0 ? (
        <p className="font-light text-muted-foreground text-sm">{galleryCopy.emptyAlbum}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              data-testid="photo-card"
              {...itemProps(index)}
              className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-background p-3"
            >
              <div className="relative">
                <ImagePreview image={photo.image} alt={photo.caption || galleryCopy.photoName(index + 1)} className="h-32 w-full rounded border border-input object-cover" />
                {photo.isCover && (
                  <Badge className="absolute top-2 left-2" data-testid="cover-badge">
                    {galleryCopy.cover}
                  </Badge>
                )}
              </div>
              <CaptionInput
                photo={photo}
                label={`${galleryCopy.fields.caption} — ${galleryCopy.photoName(index + 1)}`}
                onSave={async (caption) => apply(await updateGalleryPhoto({ albumId: album.id, photoId: photo.id, caption }), galleryCopy.toasts.photoUpdated)}
              />
              <div className="flex flex-wrap items-center gap-1">
                <span {...handleProps(index)} title={galleryCopy.dragHandle} className="hidden cursor-grab text-muted-foreground md:inline-flex">
                  <GripVertical className="size-4" />
                </span>
                {!photo.isCover && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => apply(await setGalleryCover({ albumId: album.id, photoId: photo.id }), galleryCopy.toasts.coverChanged)}
                  >
                    {galleryCopy.makeCover}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={galleryCopy.moveUp(galleryCopy.photoName(index + 1))}
                  disabled={index === 0}
                  onClick={() => void move(index, index - 1)}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={galleryCopy.moveDown(galleryCopy.photoName(index + 1))}
                  disabled={index === photos.length - 1}
                  onClick={() => void move(index, index + 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <AdminConfirmDeleteDialog
                  itemName={galleryCopy.photoName(index + 1)}
                  copy={galleryCopy.deletePhoto}
                  onConfirm={async () => apply(await deleteGalleryPhoto({ albumId: album.id, photoId: photo.id }), galleryCopy.toasts.photoDeleted)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Caption field that saves on blur or Enter, only when it changed. */
function CaptionInput({ photo, label, onSave }: { photo: AdminPhoto; label: string; onSave: (caption: string) => Promise<void> }) {
  const [value, setValue] = useState(photo.caption);
  const [saving, setSaving] = useState(false);

  async function commit() {
    if (value === photo.caption || saving) return;
    setSaving(true);
    await onSave(value);
    setSaving(false);
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="sr-only">{label}</span>
      <input
        type="text"
        dir="auto"
        value={value}
        maxLength={CAPTION_MAX}
        placeholder={galleryCopy.fields.caption}
        aria-label={label}
        data-testid="photo-caption"
        className="h-9 rounded-md border border-input bg-background px-3 font-light text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void commit();
          }
        }}
      />
      <span className="font-light text-muted-foreground text-xs" aria-hidden="true">
        {galleryCopy.charCount(value.length, CAPTION_MAX)}
      </span>
    </label>
  );
}
