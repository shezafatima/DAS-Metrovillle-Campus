/**
 * Cache tag for the public gallery read (007). The gallery lives in the
 * `settings` collection, so its reader is also tagged with the shared
 * SETTINGS_TAG from src/lib/settings/public.ts; this is the gallery's own
 * tag (the same string 005 used for its flat gallery group).
 */
export const GALLERY_TAG = "settings:gallery";
