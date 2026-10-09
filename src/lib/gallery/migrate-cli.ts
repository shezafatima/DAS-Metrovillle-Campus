import { ensureGalleryMigrated, type EnsureResult } from "./migrate";

/**
 * The report `npm run migrate:gallery` prints (007 US3, research R6). Kept
 * apart from scripts/migrate-gallery.ts so it can be tested in-process.
 */
export function formatMigrationReport(result: EnsureResult): string {
  switch (result.status) {
    case "none":
      return "No gallery to migrate.";
    case "already":
      return "Gallery already migrated; nothing to do.";
    case "migrated":
      return `Migrated ${result.migrated} photo(s) into ${result.albums} album(s); ${result.notMigrated} photo(s) were not migrated.`;
  }
}

/** Runs the migration and returns the report line. Throws if the database cannot be reached. */
export async function runGalleryMigration(): Promise<string> {
  return formatMigrationReport(await ensureGalleryMigrated("system:migration"));
}
