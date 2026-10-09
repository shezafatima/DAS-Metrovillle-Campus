import { describe, expect, it } from "vitest";
import { galleryCopy } from "@/content/admin";
import { SETTINGS_GALLERY_FOLDER } from "@/lib/cloudinary";
import { SETTINGS_GALLERY_FOLDER_CLIENT } from "./folder";
import { addPhotosInput, albumDetailsSchema, isCalendarDate, updatePhotoInput } from "./schema";

const msg = galleryCopy.errors;
const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) => result.error?.issues[0]?.message;

describe("album details", () => {
  it("trims the title and requires 1–80 characters", () => {
    expect(albumDetailsSchema.parse({ title: "  Annual Day " }).title).toBe("Annual Day");
    expect(firstMessage(albumDetailsSchema.safeParse({ title: "   " }))).toBe(msg.titleRequired);
    expect(firstMessage(albumDetailsSchema.safeParse({ title: "x".repeat(81) }))).toBe(msg.titleTooLong);
    expect(albumDetailsSchema.safeParse({ title: "x".repeat(80) }).success).toBe(true);
  });

  it("accepts Urdu", () => {
    expect(albumDetailsSchema.parse({ title: "سالانہ تقریب" }).title).toBe("سالانہ تقریب");
  });

  it("limits the description to 300 and defaults it to empty", () => {
    expect(albumDetailsSchema.parse({ title: "A" }).description).toBe("");
    expect(firstMessage(albumDetailsSchema.safeParse({ title: "A", description: "x".repeat(301) }))).toBe(msg.descriptionTooLong);
  });

  it("accepts an empty or real date only", () => {
    expect(albumDetailsSchema.parse({ title: "A", date: "" }).date).toBeNull();
    expect(albumDetailsSchema.parse({ title: "A", date: "2026-03-12" }).date).toBe("2026-03-12");
    for (const bad of ["2026-02-30", "12/03/2026", "2026-13-01"]) {
      expect(firstMessage(albumDetailsSchema.safeParse({ title: "A", date: bad }))).toBe(msg.date);
    }
    expect(isCalendarDate("2024-02-29")).toBe(true);
  });
});

describe("photo inputs", () => {
  const image = { url: "https://res.cloudinary.com/demo/image/upload/v1/settings/gallery/a.jpg", publicId: "settings/gallery/a", width: 10, height: 10 };

  it("limits captions to 150", () => {
    const base = { albumId: "aaaaaaaaaaaa", photoId: crypto.randomUUID() };
    expect(updatePhotoInput.safeParse({ ...base, caption: "x".repeat(150) }).success).toBe(true);
    expect(firstMessage(updatePhotoInput.safeParse({ ...base, caption: "x".repeat(151) }))).toBe(msg.captionTooLong);
  });

  it("checks ids", () => {
    expect(updatePhotoInput.safeParse({ albumId: "AAAA", photoId: crypto.randomUUID(), caption: "" }).success).toBe(false);
    expect(updatePhotoInput.safeParse({ albumId: "aaaaaaaaaaaa", photoId: "nope", caption: "" }).success).toBe(false);
  });

  it("takes 1–8 photos from the gallery folder", () => {
    expect(addPhotosInput.safeParse({ albumId: "aaaaaaaaaaaa", photos: [] }).success).toBe(false);
    expect(addPhotosInput.safeParse({ albumId: "aaaaaaaaaaaa", photos: Array(9).fill({ image }) }).success).toBe(false);
    expect(addPhotosInput.safeParse({ albumId: "aaaaaaaaaaaa", photos: [{ image }] }).success).toBe(true);
    expect(addPhotosInput.safeParse({ albumId: "aaaaaaaaaaaa", photos: [{ image: { ...image, publicId: "news/covers/a" } }] }).success).toBe(false);
  });

  it("uses the same folder as the server", () => {
    expect(SETTINGS_GALLERY_FOLDER_CLIENT).toBe(SETTINGS_GALLERY_FOLDER);
  });
});
