/**
 * The address fragment of a syllabus level (014b, spec FR-017): `#syllabi-<slug>`
 * opens that level's tab. Made from the level's name: accents are removed, letters
 * and digits are kept in lower case and everything else becomes a hyphen
 * ("Play Group" is "play-group", "Class 1" is "class-1"). A name with no letters
 * or digits gets "level-<position>". Repeats get -2, -3, ... in level order, and a
 * suffix is never allowed to collide with another level's own slug.
 *
 * Pure: the server computes the slugs once and hands them to the tabs.
 */
export function levelSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function levelSlugs(names: readonly string[]): string[] {
  const used = new Set<string>();
  const taken = (slug: string) => used.has(slug);
  return names.map((name, index) => {
    const base = levelSlug(name) || `level-${index + 1}`;
    let slug = base;
    for (let n = 2; taken(slug); n += 1) slug = `${base}-${n}`;
    used.add(slug);
    return slug;
  });
}
