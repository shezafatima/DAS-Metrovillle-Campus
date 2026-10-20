import "server-only";
import { getPublicSettings } from "@/lib/settings/public";
import type { DynamicPresence } from "./dynamic";

/**
 * Which dynamic sections have content for this request (014b). Each story
 * replaces its `false` with a read of its Settings group through
 * `getPublicSettings` (cached, never throws), so the header, the search index
 * and the pages agree. Until a section's story lands it has no content, so it
 * stays hidden.
 */
export async function resolveDynamicSections(): Promise<Required<DynamicPresence>> {
  const [classLevels, syllabi, examination] = await Promise.all([
    getPublicSettings("classLevels"),
    getPublicSettings("syllabi"),
    getPublicSettings("examination"),
  ]);
  return { syllabi: syllabi.levels.length > 0, examination: examination.blocks.length > 0, "class-levels": classLevels.levels.length > 0 };
}
