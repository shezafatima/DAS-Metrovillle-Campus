/**
 * The shape of the one-time seed data (014b, spec FR-050): the reference site's content, typed like each group's
 * admin value but without ids (the seed script adds them) and with where it came from. `adaptations` lists every
 * structural change made to fit the group's shape; the seed's dry run prints them.
 */
export interface SeedMeta {
  source: string;
  capturedOn: string;
  adaptations: string[];
}

export interface SyllabiSeed extends SeedMeta {
  levels: { name: string; subjects: { name: string; groups: { heading?: string; intro?: string; topics: string[] }[] }[] }[];
}

export interface ExaminationSeed extends SeedMeta {
  blocks: { heading: string; body: string }[];
}

export interface PortalLinksSeed extends SeedMeta {
  links: { label: string; url: string }[];
}
