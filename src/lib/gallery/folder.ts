/**
 * The Cloudinary folder gallery photos live in. Mirrors
 * SETTINGS_GALLERY_FOLDER in src/lib/cloudinary.ts, repeated here because
 * that module is server-only and the schemas also run in the browser.
 * src/lib/gallery/folder.test.ts keeps the two equal.
 */
export const SETTINGS_GALLERY_FOLDER_CLIENT = "settings/gallery";
export const SETTINGS_GALLERY_FOLDER_PREFIX = `${SETTINGS_GALLERY_FOLDER_CLIENT}/`;
