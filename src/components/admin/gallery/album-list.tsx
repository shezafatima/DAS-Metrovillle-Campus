"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, ImageIcon } from "lucide-react";
import { deleteGalleryAlbum, reorderGalleryAlbums } from "@/app/admin/(dashboard)/settings/gallery/actions";
import { AdminConfirmDeleteDialog } from "@/components/admin/admin-delete-dialog";
import { ImagePreview } from "@/components/admin/settings/image-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { galleryCopy } from "@/content/admin";
import { formatAlbumDate } from "@/content/gallery";
import { moveId } from "@/lib/gallery/rules";
import type { AdminGallery } from "@/lib/gallery/types";
import { AlbumPanel } from "./album-panel";
import { reportGalleryError } from "./report-error";
import { useReorder } from "./use-reorder";

/**
 * The Settings gallery section (007 US1): albums as cards, in the order the
 * site shows them. Every action saves at once and the list is replaced by
 * what the server returns. At six albums, Create is disabled with the reason
 * (FR-007); the server enforces the same cap (FR-006).
 */
export function AlbumList({ initial }: { initial: AdminGallery }) {
  const [gallery, setGallery] = useState(initial);
  const [announcement, setAnnouncement] = useState("");
  const albums = gallery.albums;
  const atMax = albums.length >= gallery.maxAlbums;

  async function move(from: number, to: number) {
    const ids = moveId(albums.map((album) => album.id), from, to);
    if (ids.every((id, i) => id === albums[i].id)) return;
    const previous = gallery;
    const byId = new Map(albums.map((album) => [album.id, album]));
    setGallery({ ...gallery, albums: ids.map((id) => byId.get(id)!) });
    const result = await reorderGalleryAlbums({ albumIds: ids });
    if (result.status === "success") {
      setGallery(result.data);
      setAnnouncement(galleryCopy.moved(albums[from].title, to + 1, albums.length));
      toast({ title: galleryCopy.toasts.albumsReordered, type: "success" });
    } else {
      setGallery(previous);
      reportGalleryError(result);
    }
  }

  const { itemProps, handleProps } = useReorder((from, to) => void move(from, to));

  async function remove(albumId: string, title: string) {
    const result = await deleteGalleryAlbum({ albumId });
    if (result.status === "success") {
      setGallery(result.data);
      toast({ title: galleryCopy.toasts.albumDeleted(title), type: "success" });
    } else {
      reportGalleryError(result);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="album-list">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-light text-muted-foreground text-sm">{galleryCopy.intro}</p>
        <div className="flex flex-wrap items-center gap-2">
          {atMax && (
            <span className="font-light text-muted-foreground text-xs" data-testid="album-full">
              {galleryCopy.albumFull}
            </span>
          )}
          <AlbumPanel onSaved={setGallery} triggerLabel={galleryCopy.createAlbum} triggerVariant="default" disabled={atMax} />
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {albums.length === 0 ? (
        <p className="font-light text-muted-foreground text-sm">{galleryCopy.emptyGallery}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {albums.map((album, index) => (
            <li
              key={album.id}
              data-testid="album-card"
              {...itemProps(index)}
              className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-background p-3"
            >
              <div className="flex items-start gap-3">
                <span
                  {...handleProps(index)}
                  title={galleryCopy.dragHandle}
                  className="mt-1 hidden shrink-0 cursor-grab text-muted-foreground md:inline-flex"
                >
                  <GripVertical className="size-4" />
                </span>
                {album.cover ? (
                  <ImagePreview image={album.cover} alt="" className="h-20 w-28 shrink-0 rounded border border-input object-cover" />
                ) : (
                  <span className="flex h-20 w-28 shrink-0 items-center justify-center rounded border border-input bg-muted text-muted-foreground">
                    <ImageIcon aria-hidden="true" className="size-5" />
                    <span className="sr-only">{galleryCopy.noCover}</span>
                  </span>
                )}
                <div className="flex min-w-0 flex-col gap-1">
                  <span dir="auto" className="break-words font-bold text-foreground text-sm" data-testid="album-title">
                    {album.title}
                  </span>
                  <span className="font-light text-muted-foreground text-xs" data-testid="album-count">
                    {galleryCopy.photoCount(album.photoCount)}
                  </span>
                  {album.date && <span className="font-light text-muted-foreground text-xs">{formatAlbumDate(album.date)}</span>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/settings/gallery/${album.id}`} className={buttonVariants({ size: "sm" })} aria-label={`${galleryCopy.open}: ${album.title}`}>
                  {galleryCopy.open}
                </Link>
                <AlbumPanel
                  album={album}
                  onSaved={setGallery}
                  triggerLabel={galleryCopy.edit}
                  triggerAriaLabel={`${galleryCopy.edit}: ${album.title}`}
                  triggerSize="sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={galleryCopy.moveUp(album.title)}
                  disabled={index === 0}
                  onClick={() => void move(index, index - 1)}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={galleryCopy.moveDown(album.title)}
                  disabled={index === albums.length - 1}
                  onClick={() => void move(index, index + 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <AdminConfirmDeleteDialog itemName={album.title} copy={galleryCopy.deleteAlbum} onConfirm={() => void remove(album.id, album.title)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
