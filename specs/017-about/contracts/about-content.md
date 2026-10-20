# Contract: About content shapes (017 → 014)

This is the agreement that lets 014-page-content switch the About source from content files to the database without touching the display components.

## Producer and consumer

- **Producer (017)**: `src/content/about/{our-story,vision-mission,core-values,management-team,messages,page}.ts`. Each exports a value that parses with its schema.
- **Producer (014, later)**: a reader that loads the stored group, filters out list items whose `deletedAt` is not null, removes the envelope's `deletedAt`, and parses with the **same** schema.
- **Consumer**: `src/components/about/*` section components. Each receives the parsed value as props and never imports a content file directly. Only `src/app/(public)/about/page.tsx` does that.

## Schemas (`src/lib/about/schema.ts`, Zod)

```ts
const text = (max: number) => z.string().trim().min(1).max(max);
const longText = (max: number) =>
  z.string().max(max).refine((s) => s === s.trim() && !/\n{3,}/.test(s), "paragraphs separated by one blank line");
const imageRef = z.object({ url: z.string().url().or(z.string().startsWith("/")), publicId: z.string(), width: z.number().int().positive(), height: z.number().int().positive() });
const image = imageRef.nullable();
const itemId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const uniqueIds = <T extends { id: string }>(items: T[]) => new Set(items.map((i) => i.id)).size === items.length;

export const ICON_KEYS = ["compass", "shield-check", "target", "award", "heart-handshake", "landmark", "users", "book-open", "star", "sprout"] as const;

export const ourStorySchema = z.object({
  heading: text(80), subheading: text(160), body: longText(4000), image,
  urdu: z.object({ lang: z.literal("ur"), heading: text(80), subheading: text(160), body: longText(4000) }).optional(),
});

export const visionMissionSchema = z.object({
  heading: text(80), subheading: text(160),
  vision: z.object({ heading: text(40), tagline: text(160).optional(), body: longText(1500) }),
  mission: z.object({ heading: text(40), body: longText(1500) }),
  urdu: z.object({
    lang: z.literal("ur"),
    vision: z.object({ heading: text(40), tagline: z.object({ lang: z.enum(["ur", "ar"]), text: text(160) }).optional(), body: longText(1500) }),
    mission: z.object({ heading: text(40), body: longText(1500) }),
  }).optional(),
});

export const coreValueSchema = z.object({ id: itemId, name: text(60), description: text(240).optional(), icon: z.enum(ICON_KEYS) });
export const coreValuesSchema = z.object({
  heading: text(80), subheading: text(160), intro: longText(1000),
  values: z.array(coreValueSchema).min(1).max(12).refine(uniqueIds),
  urdu: z.object({
    lang: z.literal("ur"), heading: text(80), subheading: text(160), intro: longText(1000),
    values: z.array(z.object({ id: itemId, name: text(60), description: text(240).optional() })),
  }).optional(),
});

export const teamMemberSchema = z.object({ id: itemId, name: text(80), designation: text(80), description: text(300), photo: image });
export const managementTeamSchema = z.object({
  heading: text(80), subheading: text(160).optional(),
  members: z.array(teamMemberSchema).max(24).refine(uniqueIds),
});

export const messageSchema = z.object({ id: itemId, name: text(80), designation: text(120), body: longText(4000), photo: image });
export const messagesSchema = z.object({
  heading: text(80), subheading: text(160).optional(),
  messages: z.array(messageSchema).max(12).refine(uniqueIds),
});

export const aboutPageSchema = z.object({ title: text(60) });
```

Types are `z.infer<...>` of each schema (`OurStory`, `VisionMission`, `CoreValues`, `CoreValue`, `ManagementTeam`, `TeamMember`, `Messages`, `Message`, `AboutPage`).

## Mapping to the 005/014 field engine

| Schema form | Engine field type | Note for 014 |
|---|---|---|
| `text(n)` | `text` with `maxLength: n` | exists |
| `longText(n)` | `longText` with `maxLength: n` | exists. The editor keeps blank-line paragraphs |
| `image` | `image` (`ImageRef`) | exists. 014 adds an `about-person` / `about-story` upload `kind` and folder |
| list of items | `list` with `itemFields`, `maxItems` | exists. The engine adds `id`/`deletedAt` |
| `icon` (`z.enum(ICON_KEYS)`) | **none yet** | 014 adds a `select` field type, or a text field with an allowed-values rule |
| `urdu` blocks | `group` with `text`/`longText` | exists. `lang` is fixed, not edited |

## Invariants

1. A component never receives `undefined` for a required field. Parsing happens before rendering, and a value that fails to parse is a build-time test failure in 017 (and a fallback to the content file in 014).
2. List order is display order. Ids are unique per list.
3. Placeholders (`teamPlaceholders`) are never part of a stored value and never written to the database.
4. An empty `members` list (production) or an empty `messages` list (every mode) hides that section and its menu and search entries. 014 may save an empty list without breaking the page.
5. Anchor ids and menu labels are not in these shapes. They are layout (`pageSections.about`).
