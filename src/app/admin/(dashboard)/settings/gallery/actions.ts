"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { z } from "zod";
import { requireAdminAccess } from "@/lib/dal";
import { GALLERY_TAG } from "@/lib/gallery/cache-tags";
import * as gallery from "@/lib/gallery/mutations";
import {
  addPhotosInput,
  createAlbumInput,
  deleteAlbumInput,
  fieldErrors,
  photoRefInput,
  reorderAlbumsInput,
  reorderPhotosInput,
  updateAlbumInput,
  updatePhotoInput,
} from "@/lib/gallery/schema";
import type { AddPhotosResult, AdminAlbum, AdminGallery, GalleryResult } from "@/lib/gallery/types";
import { logSecurityEvent } from "@/lib/log";
import { SETTINGS_TAG } from "@/lib/settings/public";

/**
 * Gallery album and photo actions (007, contracts/gallery-actions.md).
 *
 * Every action starts with `requireAdminAccess("settings")`: the gallery is
 * part of the Settings permission (011). The acting admin is only ever the
 * session; nothing in the input names an actor. Next checks the request's
 * Origin against the host for every Server Action (FR-002). Each action saves
 * at once (research R3); the caps are enforced in src/lib/gallery (ADR-0005).
 */

type Parsed<S extends z.ZodType> = { ok: true; value: z.output<S> } | { ok: false; fields: Record<string, string> };

function parse<S extends z.ZodType>(schema: S, input: unknown): Parsed<S> {
  const result = schema.safeParse(input);
  return result.success ? { ok: true, value: result.data } : { ok: false, fields: fieldErrors(result.error) };
}

/** Turns a mutation outcome into the action result: refresh the site on success, log it, report errors. */
function finish<T>(outcome: gallery.MutationResult<T>, email: string): GalleryResult<T> {
  if (!outcome.ok) {
    if (outcome.error === "invalid") return { status: "error", error: "invalid", fields: {} };
    return { status: "error", error: outcome.error };
  }
  // { expire: 0 }: the next request is a fresh read, never stale-then-fresh.
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  revalidateTag(GALLERY_TAG, { expire: 0 });
  revalidatePath("/resources");
  revalidatePath("/resources/gallery/[albumId]", "page");
  logSecurityEvent({ type: "gallery_changed", email, action: outcome.log.action, target: outcome.log.albumTitle || undefined });
  return { status: "success", data: outcome.data };
}

const invalid = (fields: Record<string, string>) => ({ status: "error", error: "invalid", fields }) as const;

export async function createGalleryAlbum(input: unknown): Promise<GalleryResult<AdminGallery>> {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return { status: "error", error: access.reason };
  const parsed = parse(createAlbumInput, input);
  if (!parsed.ok) return invalid(parsed.fields);
  return finish(await gallery.createAlbum(parsed.value, access.session.email), access.session.email);
}

export async function updateGalleryAlbum(input: unknown): Promise<GalleryResult<AdminGallery>> {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return { status: "error", error: access.reason };
  const parsed = parse(updateAlbumInput, input);
  if (!parsed.ok) return invalid(parsed.fields);
  return finish(await gallery.updateAlbum(parsed.value, access.session.email), access.session.email);
}

export async function reorderGalleryAlbums(input: unknown): Promise<GalleryResult<AdminGallery>> {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return { status: "error", error: access.reason };
  const parsed = parse(reorderAlbumsInput, input);
  if (!parsed.ok) return invalid(parsed.fields);
  return finish(await gallery.reorderAlbums(parsed.value.albumIds, access.session.email), access.session.email);
}

export async function deleteGalleryAlbum(input: unknown): Promise<GalleryResult<AdminGallery>> {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return { status: "error", error: access.reason };
  const parsed = parse(deleteAlbumInput, input);
  if (!parsed.ok) return invalid(parsed.fields);
  return finish(await gallery.deleteAlbum(parsed.value.albumId, access.session.email), access.session.email);
}

export async function addGalleryPhotos(input: unknown): Promise<GalleryResult<AddPhotosResult>> {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return { status: "error", error: access.reason };
  const parsed = parse(addPhotosInput, input);
  if (!parsed.ok) return invalid(parsed.fields);
  return finish(await gallery.addPhotos(parsed.value, access.session.email), access.session.email);
}

export async function updateGalleryPhoto(input: unknown): Promise<GalleryResult<AdminAlbum>> {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return { status: "error", error: access.reason };
  const parsed = parse(updatePhotoInput, input);
  if (!parsed.ok) return invalid(parsed.fields);
  return finish(await gallery.updatePhoto(parsed.value, access.session.email), access.session.email);
}

export async function reorderGalleryPhotos(input: unknown): Promise<GalleryResult<AdminAlbum>> {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return { status: "error", error: access.reason };
  const parsed = parse(reorderPhotosInput, input);
  if (!parsed.ok) return invalid(parsed.fields);
  return finish(await gallery.reorderPhotos(parsed.value, access.session.email), access.session.email);
}

export async function setGalleryCover(input: unknown): Promise<GalleryResult<AdminAlbum>> {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return { status: "error", error: access.reason };
  const parsed = parse(photoRefInput, input);
  if (!parsed.ok) return invalid(parsed.fields);
  return finish(await gallery.setCover(parsed.value, access.session.email), access.session.email);
}

export async function deleteGalleryPhoto(input: unknown): Promise<GalleryResult<AdminAlbum>> {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return { status: "error", error: access.reason };
  const parsed = parse(photoRefInput, input);
  if (!parsed.ok) return invalid(parsed.fields);
  return finish(await gallery.deletePhoto(parsed.value, access.session.email), access.session.email);
}
