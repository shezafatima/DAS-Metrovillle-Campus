# Contract: Academics content (Zod shapes and the 014 mapping)

The schemas live in `src/lib/academics/schema.ts`, and the values are typed files in `src/content/academics/`. 014-page-content stores each value unchanged as a Settings-style group, so the components never know which source they read from.

```ts
// src/lib/academics/schema.ts (shape only; helpers from src/lib/content/fields.ts)
export const VIDEO_PROVIDERS = ["youtube", "instagram"] as const;

export const videoEntrySchema = z
  .object({
    provider: z.enum(VIDEO_PROVIDERS),
    url: z.string().trim().max(300),            // "" = no video
    poster: imageRef.nullable(),               // null = local placeholder poster
    title: text(120),
  })
  .refine((v) => v.url === "" || resolveVideo(v) !== null, "URL is not a recognised post/video for its provider");

export const academicsPageSchema = z.object({ title: text(60), playLabel: text(40) });

export const academicOverviewSchema = z
  .object({ heading: text(80), subheading: text(160), body: longText(4000), image: imageRef.nullable(), imageAlt: z.string().trim().max(200) })
  .refine((v) => v.image === null || v.imageAlt.length > 0, "imageAlt is required with an image");

export const teachersTrainingSchema = z.object({
  heading: text(80),
  intro: longText(1500),
  items: z.array(z.object({ id: itemId, text: text(160) })).min(1).max(40).refine(uniqueIds),
  photos: z.array(z.object({ id: itemId, image: imageRef, alt: text(200) })).max(3).refine(uniqueIds),
  video: videoEntrySchema,
});

export const hifzEQuranSchema = z.object({
  heading: text(80),
  subheading: text(160),
  intro: longText(1500),
  subsections: z.array(z.object({ id: itemId, heading: text(80), body: longText(1500) })).min(1).max(6).refine(uniqueIds),
  video: videoEntrySchema,
});
```

## Mapping for 014 (Settings field types)

| Value path | 014 field type | Note |
|---|---|---|
| `*.heading`, `*.subheading`, `title`, `playLabel`, `video.title`, `photos[].alt`, `imageAlt` | `text` | |
| `body`, `intro`, `subsections[].body` | `longText` | blank line = new paragraph |
| `image`, `photos[].image`, `video.poster` | `image` | Cloudinary upload replaces the local path |
| `items`, `photos`, `subsections` | `list` | the `deletedAt` envelope is removed by 014's reader before display |
| `video.provider` | **select** | Not in the engine yet. 014 adds a select or an allowed-values rule (the same note as 017's icon keys) |
| `video.url` | `text` + validator | reuse `resolveVideo` as the validator, as 005 reuses `parseYouTubeAddress` |

## Invariants

- No Urdu characters in any Academics value (unit test).
- Image URLs are local (`/…`) or `https://res.cloudinary.com/…`. No stock hosts.
- The T1 paragraph exists only in `hifz-e-quran.ts`, with its `PENDING CLIENT APPROVAL` comment and review note.
